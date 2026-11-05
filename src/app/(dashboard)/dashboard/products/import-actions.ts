'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, parseNum, pickOption, checkSize } from '@/lib/bulk-server';
import { PRODUCT_APPLICATION_OPTIONS, PRODUCT_CATEGORIES, UOM_OPTIONS } from '@/lib/master-options';
import { PACKAGE_TYPES } from '@/lib/packing';
import { SPEC_KEYS, PACK_NUM_KEYS } from './fields';

export async function importProducts(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/products', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const [{ data: brandRows }, { data: existing }] = await Promise.all([
    supabase.from('brands').select('name'),
    supabase.from('products').select('name, brand'),
  ]);
  const brands = (brandRows ?? []).map((b) => b.name as string);
  const newBrands = new Set<string>();
  const seen = new Set((existing ?? []).map((p) => `${String(p.name).trim().toLowerCase()}|${String(p.brand ?? '').toLowerCase()}`));
  const cats = Object.keys(PRODUCT_CATEGORIES);

  const errors: ImportResult['errors'] = [];
  const good: Record<string, unknown>[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const name = s(r.name);
    if (!name) { err('Product Name wajib diisi.'); continue; }

    const category = pickOption(r.category, cats);
    if (!s(r.category)) { err('Main Category wajib diisi.'); continue; }
    if (!category) { err(`Main Category tidak dikenal: "${s(r.category)}". Pilihan: ${cats.join(', ')}.`); continue; }

    let subcategory: string | null = null;
    if (s(r.subcategory)) {
      subcategory = pickOption(r.subcategory, PRODUCT_CATEGORIES[category]);
      if (!subcategory) { err(`Subcategory "${s(r.subcategory)}" bukan bagian dari ${category}. Pilihan: ${PRODUCT_CATEGORIES[category].join(', ')}.`); continue; }
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
    const brandIn = s(r.brand) || 'FANOS';
    const brand = pickOption(brandIn, [...brands, ...newBrands]) ?? brandIn;
    const key = `${name.toLowerCase()}|${brand.toLowerCase()}`;
    if (seen.has(key)) { err(`Produk "${name}" (brand ${brand}) sudah ada atau duplikat di file.`); continue; }
    seen.add(key);
    if (!brands.some((b) => b.toLowerCase() === brand.toLowerCase())) newBrands.add(brand);

    const specs: Record<string, string | null> = {};
    for (const k of SPEC_KEYS) specs[k] = s(r[k]) || null;

    good.push({
      name, brand, category, subcategory, application, uom, package_type: packageType,
      notes: s(r.notes) || null, image_url: null, ...pack, ...specs,
    });
  }

  const result: ImportResult = { total: rows.length, valid: good.length, errors };
  if (!commit || good.length === 0) return result;

  if (newBrands.size) {
    const { error: be } = await supabase.from('brands').insert(Array.from(newBrands).map((name) => ({ name })));
    if (be && be.code !== '23505') return { ...result, error: 'Brand baru gagal dibuat: ' + be.message };
  }
  // Dipecah per 200 baris agar aman untuk batas ukuran request.
  for (let i = 0; i < good.length; i += 200) {
    const { error } = await supabase.from('products').insert(good.slice(i, i + 200));
    if (error) return { ...result, inserted: i, error: `Berhenti di baris data ke-${i + 1}: ${error.message}` };
  }
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/products/price-list');
  return { ...result, inserted: good.length };
}
