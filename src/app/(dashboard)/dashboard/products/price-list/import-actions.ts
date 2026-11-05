'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, parseNum, checkSize } from '@/lib/bulk-server';

// Mengisi/ubah harga produk yang sudah ada di Catalogue (dicocokkan lewat SKU) dan memasukkannya ke Price List.
export async function importPriceList(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/products/price-list', 'edit'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const { data: prods } = await supabase.from('products').select('id, sku');
  const bySku = new Map((prods ?? []).map((p) => [String(p.sku).trim().toLowerCase(), p.id as string]));

  const errors: ImportResult['errors'] = [];
  const good: { id: string; cost_price: number; price: number }[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const sku = s(r.sku);
    if (!sku) { err('SKU wajib diisi.'); continue; }
    const id = bySku.get(sku.toLowerCase());
    if (!id) { err(`SKU "${sku}" tidak ditemukan di Product Catalogue.`); continue; }
    if (seen.has(sku.toLowerCase())) { err(`SKU "${sku}" muncul lebih dari sekali di file.`); continue; }
    const cost = parseNum(r.cost_price);
    const price = parseNum(r.price);
    if (cost == null || price == null) { err('Cost Price dan Selling Price wajib diisi.'); continue; }
    if (Number.isNaN(cost) || Number.isNaN(price) || cost < 0 || price < 0) { err('Harga harus berupa angka ≥ 0.'); continue; }
    seen.add(sku.toLowerCase());
    good.push({ id, cost_price: cost, price });
  }

  const result: ImportResult = { total: rows.length, valid: good.length, errors };
  if (!commit || good.length === 0) return result;

  let done = 0;
  for (let i = 0; i < good.length; i += 20) {
    const res = await Promise.all(
      good.slice(i, i + 20).map((g) => supabase.from('products').update({ cost_price: g.cost_price, price: g.price, price_listed: true }).eq('id', g.id)),
    );
    const fail = res.find((x) => x.error);
    if (fail?.error) return { ...result, inserted: done, error: fail.error.message };
    done += res.length;
  }
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/products/price-list');
  return { ...result, inserted: done };
}
