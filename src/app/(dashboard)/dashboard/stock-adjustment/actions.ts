'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStockMap, postMovements } from '@/lib/stock';

export type AdjInput = {
  doc_no?: string; adj_date: string; warehouse_id: string; adj_type: 'IN' | 'OUT' | 'OPNAME'; reason: string; notes?: string;
  items: { sku: string; qty: number; notes?: string }[];
};

function refresh() {
  ['stock-adjustment', 'current-stock', 'stock-movement'].forEach((p) => revalidatePath('/dashboard/' + p));
}

export async function createAdjustment(input: AdjInput) {
  if (!input.warehouse_id) return { error: 'Mohon pilih Gudang terlebih dahulu.' };
  if (!input.adj_date) return { error: 'Kolom Tanggal wajib diisi.' };
  if (!input.reason?.trim()) return { error: 'Kolom Alasan / Kategori wajib diisi.' };
  // Satu SKU hanya boleh sekali dalam satu dokumen.
  const items = input.items.filter((i) => i.sku && (input.adj_type === 'OPNAME' ? i.qty >= 0 : i.qty > 0));
  if (items.length === 0) return { error: 'Minimal satu item harus diisi.' };
  if (new Set(items.map((i) => i.sku)).size !== items.length) return { error: 'Ada SKU yang diinput lebih dari sekali.' };

  const supabase = createClient();
  const stock = await getStockMap(supabase, input.warehouse_id, items.map((i) => i.sku));
  const { data: prods } = await supabase.from('products').select('id, sku').in('sku', items.map((i) => i.sku));
  const idBy = new Map((prods ?? []).map((p) => [p.sku as string, p.id as string]));

  // Selisih (+/-) per item dihitung ulang di server dari stok terkini.
  const calc = items.map((i) => {
    const sys = stock.get(i.sku) ?? 0;
    const diff = input.adj_type === 'IN' ? i.qty : input.adj_type === 'OUT' ? -i.qty : i.qty - sys;
    return { ...i, sys, diff };
  });
  for (const c of calc) {
    if (c.sys + c.diff < 0) return { error: `Stok ${c.sku} tidak cukup (tersedia ${c.sys}).` };
  }

  const { data: adj, error } = await supabase
    .from('stock_adjustments')
    .insert({ doc_no: input.doc_no?.trim() || null, adj_date: input.adj_date, warehouse_id: input.warehouse_id, adj_type: input.adj_type, reason: input.reason.trim(), notes: input.notes?.trim() || null })
    .select('id, doc_no')
    .single();
  if (error) return { error: error.code === '23505' ? 'Adjustment ID sudah digunakan.' : error.message };

  const { error: iErr } = await supabase.from('stock_adjustment_items').insert(
    calc.map((c, n) => ({ adjustment_id: adj.id, product_id: idBy.get(c.sku) ?? null, sku: c.sku, qty: c.qty, system_qty: input.adj_type === 'OPNAME' ? c.sys : null, diff: c.diff, notes: c.notes || null, sort_order: n }))
  );
  if (iErr) { await supabase.from('stock_adjustments').delete().eq('id', adj.id); return { error: iErr.message }; }

  const post = await postMovements(supabase, {
    warehouse_id: input.warehouse_id, date: input.adj_date, ref_type: 'ADJUSTMENT', ref_id: adj.id, ref_no: adj.doc_no, reason: input.reason.trim(), notes: input.notes?.trim() || null,
    items: calc.map((c) => ({ sku: c.sku, qty: c.diff, product_id: idBy.get(c.sku) ?? null })),
  });
  if (post.error) { await supabase.from('stock_adjustments').delete().eq('id', adj.id); return { error: post.error }; }
  refresh();
  return { success: true };
}

// Hapus (void) dokumen: catatan stoknya dibalik. Ditolak bila hasilnya membuat stok minus.
export async function deleteAdjustment(id: string) {
  const supabase = createClient();
  const { data: adj } = await supabase.from('stock_adjustments').select('id, warehouse_id').eq('id', id).single();
  if (!adj) return { error: 'Dokumen tidak ditemukan' };
  const { data: mv } = await supabase.from('stock_movements').select('sku, qty').eq('ref_type', 'ADJUSTMENT').eq('ref_id', id);
  const stock = await getStockMap(supabase, adj.warehouse_id, (mv ?? []).map((m) => m.sku as string));
  for (const m of mv ?? []) {
    const after = (stock.get(m.sku as string) ?? 0) - Number(m.qty);
    if (after < 0) return { error: `Dokumen tidak dapat dihapus: stok ${m.sku} akan menjadi minus (${after}). Stok sudah terpakai transaksi lain.` };
  }
  await supabase.from('stock_movements').delete().eq('ref_type', 'ADJUSTMENT').eq('ref_id', id);
  const { error } = await supabase.from('stock_adjustments').delete().eq('id', id);
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}
