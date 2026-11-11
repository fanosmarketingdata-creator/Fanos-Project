'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, parseNum, pickOption, checkSize, pruneAbsent, inChunks } from '@/lib/bulk-server';
import { PRODUCT_APPLICATION_OPTIONS, UOM_OPTIONS } from '@/lib/master-options';
import { loadCategories } from '@/lib/categories';
import { PACKAGE_TYPES } from '@/lib/packing';
import { SPEC_KEYS, PACK_NUM_KEYS } from './fields';

export async function importProducts(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/products', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const [{ data: brandRows }, { data: existing }] = await Promise.all([
    supabase.from('brands').select('name'),
    supabase.from('products').select('id, name, brand, sku, category'),
  ]);
  const brands = (brandRows ?? []).map((b) => b.name as string);
  const newBrands = new Set<string>();
  const keyOf = (name: string, brand: string) => `${name.trim().toLowerCase()}|${brand.toLowerCase()}`;
  const owner = new Map<string, string>((existing ?? []).map((p) => [keyOf(String(p.name), String(p.brand ?? '')), String(p.id)]));
  const keyById = new Map<string, string>((existing ?? []).map((p) => [String(p.id), keyOf(String(p.name), String(p.brand ?? ''))]));
  const bySku = new Map((existing ?? []).filter((p) => p.sku).map((p) => [String(p.sku).trim().toLowerCase(), p]));
  const catMap = await loadCategories(supabase);
  const cats = Object.keys(catMap);
  const seenSku = new Set<string>();

  const errors: ImportResult['errors'] = [];
  const adds: Record<string, unknown>[] = [];
  const upds: { id: string; data: Record<string, unknown> }[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const name = s(r.name);
    if (!name) { err('Product Name wajib diisi.'); continue; }

    // SKU = kunci pencocokan. Sudah ada → data lama ditimpa; kosong → baru (SKU otomatis); belum ada → baru dengan SKU tersebut.
    const skuIn = s(r.sku);
    if (skuIn && seenSku.has(skuIn.toLowerCase())) { err(`SKU "${skuIn}" muncul lebih dari sekali di file.`); continue; }
    const match = skuIn ? bySku.get(skuIn.toLowerCase()) : undefined;
    const selfId = match ? String(match.id) : '';

    const catIn = s(r.category) || (match && r.category === undefined ? String(match.category ?? '') : '');
    const category = pickOption(catIn, cats);
    if (!catIn) { err('Main Category wajib diisi.'); continue; }
    if (!category) { err(`Main Category tidak dikenal: "${catIn}". Pilihan: ${cats.join(', ')}.`); continue; }

    let subcategory: string | null = null;
    if (s(r.subcategory)) {
      subcategory = pickOption(r.subcategory, catMap[category]);
      if (!subcategory) { err(`Subcategory "${s(r.subcategory)}" bukan bagian dari ${category}. Pilihan: ${catMap[category].join(', ')}.`); continue; }
    }
    let application: string | null = null;
    if (s(r.application)) {
      application = pickOption(r.application, PRODUCT_APPLICATION_OPTIONS);
      if (!application) { err(`Application tidak dikenal. Pilihan: ${PRODUCT_APPLICATION_OPTIONS.join(', ')}.`); continue; }
    }
    let uom = 'Pcs';
    if (s(r.uom)) {
      const u = pickOption(r.uom, UOM_OPTIONS);
      if (!u) { err(`UOM tidak dikenal. Pilihan: ${UOM_OPTIONS.join(', ')}.`); continue; }
      uom = u;
    }
    let packageType = 'Carton';
    if (s(r.package_type)) {
      const p = pickOption(r.package_type, [...PACKAGE_TYPES]);
      if (!p) { err(`Jenis Kemasan tidak dikenal. Pilihan: ${PACKAGE_TYPES.join(', ')}.`); continue; }
      packageType = p;
    }

    const pack: Record<string, number> = {};
    let packErr = '';
    for (const k of PACK_NUM_KEYS) {
      const v = s(r[k]) ? parseNum(r[k]) : 0;
      if (v == null || Number.isNaN(v) || v < 0) { packErr = `Kolom ${k} harus berupa angka ≥ 0.`; break; }
      pack[k] = v;
    }
    if (packErr) { err(packErr); continue; }
    if (pack.gross_weight > 0 && pack.units_per_package > 0 && pack.net_weight * pack.units_per_package > pack.gross_weight + 0.0005) {
      err('Berat kotor per kemasan tidak boleh lebih kecil dari berat bersih × isi per kemasan.'); continue;
    }

    // Brand: pakai yang sudah ada; bila belum ada akan dibuat otomatis saat impor.
    const brandIn = s(r.brand) || (match && r.brand === undefined ? String(match.brand ?? 'FANOS') : 'FANOS');
    const brand = pickOption(brandIn, [...brands, ...newBrands]) ?? brandIn;
    const key = keyOf(name, brand);
    const owned = owner.get(key);
    if (owned && owned !== selfId) { err(`Produk "${name}" (brand ${brand}) sudah ada atau duplikat di file.`); continue; }
    if (!brands.some((b) => b.toLowerCase() === brand.toLowerCase())) newBrands.add(brand);

    // Harga (opsional): bila keduanya diisi, produk otomatis masuk Price List.
    const costIn = s(r.cost_price), priceIn = s(r.price);
    let listed = false, costPrice = 0, sellPrice = 0;
    if (costIn || priceIn) {
      if (!costIn || !priceIn) { err('Cost Price dan Selling Price harus diisi bersamaan (atau dikosongkan keduanya).'); continue; }
      const cp = parseNum(costIn), sp = parseNum(priceIn);
      if (cp == null || sp == null || Number.isNaN(cp) || Number.isNaN(sp) || cp < 0 || sp < 0) { err('Cost Price dan Selling Price harus berupa angka ≥ 0.'); continue; }
      listed = true; costPrice = cp; sellPrice = sp;
    }

    const specs: Record<string, string | null> = {};
    for (const k of SPEC_KEYS) specs[k] = s(r[k]) || null;

    const base = {
      name, brand, category, subcategory, application, uom, package_type: packageType,
      notes: s(r.notes) || null, ...pack, ...specs,
    };
    if (skuIn) seenSku.add(skuIn.toLowerCase());
    const prices = listed ? { cost_price: costPrice, price: sellPrice, price_listed: true } : {};
    if (match) {
      const old = keyById.get(selfId);
      if (old) owner.delete(old);
      owner.set(key, selfId); keyById.set(selfId, key);
      const map: Record<string, string[]> = {
        name: ['name'], brand: ['brand'], category: ['category'], subcategory: ['subcategory'], application: ['application'],
        uom: ['uom'], package_type: ['package_type'], notes: ['notes'],
      };
      for (const k of [...SPEC_KEYS, ...PACK_NUM_KEYS]) map[k] = [k];
      // Harga: kolom kosong = tidak diubah (tidak mengeluarkan produk dari Price List).
      upds.push({ id: selfId, data: { ...pruneAbsent(base, r, map), ...prices } });
    } else {
      owner.set(key, `new:${r._row}`);
      adds.push({ sku: skuIn || null, ...base, image_url: null, ...prices });
    }
  }

  const result: ImportResult = { total: rows.length, valid: adds.length + upds.length, errors, added: adds.length, updated: upds.length };
  if (!commit || result.valid === 0) return result;
  if (adds.length) { const denied = await guard('/dashboard/products', 'create'); if (denied) return { ...result, error: denied }; }
  if (upds.length) { const denied = await guard('/dashboard/products', 'edit'); if (denied) return { ...result, error: denied }; }

  if (newBrands.size) {
    const { error: be } = await supabase.from('brands').insert(Array.from(newBrands).map((name) => ({ name })));
    if (be && be.code !== '23505') return { ...result, error: 'Brand baru gagal dibuat: ' + be.message };
  }
  // Dipecah per 200 baris agar aman untuk batas ukuran request.
  for (let i = 0; i < adds.length; i += 200) {
    const { error } = await supabase.from('products').insert(adds.slice(i, i + 200));
    if (error) return { ...result, inserted: i, error: `Berhenti di baris data baru ke-${i + 1}: ${error.message}` };
  }
  const updErr = await inChunks(upds, 20, async (u) => {
    const { error } = await supabase.from('products').update(u.data).eq('id', u.id);
    return error ? error.message : null;
  });
  if (updErr) return { ...result, error: 'Sebagian data gagal diperbarui: ' + updErr };
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/products/price-list');
  return { ...result, inserted: adds.length + upds.length };
}
