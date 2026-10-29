'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStockMap, postMovements } from '@/lib/stock';

export type TransferInput = {
  doc_no?: string; transfer_date: string; from_warehouse_id: string; to_warehouse_id: string; notes?: string;
  items: { sku: string; qty: number }[];
};

function refresh() {
  ['stock-transfer', 'current-stock', 'stock-movement'].forEach((p) => revalidatePath('/dashboard/' + p));
}

export async function createTransfer(input: TransferInput) {
  { const denied = await guard('/dashboard/stock-transfer', 'create'); if (denied) return { error: denied }; }
  if (!input.from_warehouse_id || !input.to_warehouse_id) return { error: 'Gudang asal dan tujuan wajib dipilih.' };
  if (input.from_warehouse_id === input.to_warehouse_id) return { error: 'Gudang asal dan tujuan tidak boleh sama.' };
  const items = input.items.filter((i) => i.sku && i.qty > 0);
  if (items.length === 0) return { error: 'Minimal satu item harus diisi.' };
  if (new Set(items.map((i) => i.sku)).size !== items.length) return { error: 'Ada SKU yang diinput lebih dari sekali.' };

  const supabase = createClient();
  const { data: prods } = await supabase.from('products').select('id, sku').in('sku', items.map((i) => i.sku));
  const idBy = new Map((prods ?? []).map((p) => [p.sku as string, p.id as string]));
  const { data: t, error } = await supabase
    .from('stock_transfers')
    .insert({ doc_no: input.doc_no?.trim() || null, transfer_date: input.transfer_date, from_warehouse_id: input.from_warehouse_id, to_warehouse_id: input.to_warehouse_id, notes: input.notes?.trim() || null, status: 'DRAFT' })
    .select('id')
    .single();
  if (error) return { error: error.code === '23505' ? 'Transfer ID sudah digunakan.' : error.message };
  const { error: iErr } = await supabase.from('stock_transfer_items').insert(
    items.map((i, n) => ({ transfer_id: t.id, product_id: idBy.get(i.sku) ?? null, sku: i.sku, qty: i.qty, sort_order: n }))
  );
  if (iErr) { await supabase.from('stock_transfers').delete().eq('id', t.id); return { error: iErr.message }; }
  refresh();
  return { success: true };
}

// Langkah 1: Gudang asal mengirim. Stok asal berkurang, barang berstatus In-Transit.
export async function shipTransfer(id: string) {
  { const denied = await guard('/dashboard/stock-transfer', 'edit'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: t } = await supabase.from('stock_transfers').select('id, doc_no, status, transfer_date, from_warehouse_id').eq('id', id).single();
  if (!t) return { error: 'Dokumen tidak ditemukan' };
  if (t.status !== 'DRAFT') return { error: 'Hanya transfer berstatus Draft yang dapat dikirim.' };
  const { data: items } = await supabase.from('stock_transfer_items').select('sku, qty, product_id').eq('transfer_id', id);
  const stock = await getStockMap(supabase, t.from_warehouse_id, (items ?? []).map((i) => i.sku as string));
  for (const i of items ?? []) {
    const have = stock.get(i.sku as string) ?? 0;
    if (have < Number(i.qty)) return { error: `Stok ${i.sku} di gudang asal tidak cukup (tersedia ${have}, dikirim ${i.qty}).` };
  }
  const post = await postMovements(supabase, {
    warehouse_id: t.from_warehouse_id, date: t.transfer_date, ref_type: 'TRANSFER_OUT', ref_id: id, ref_no: t.doc_no, reason: 'Transfer Out', notes: null,
    items: (items ?? []).map((i) => ({ sku: i.sku as string, qty: -Number(i.qty), product_id: (i.product_id as string | null) ?? null })),
  });
  if (post.error) return { error: post.error };
  const { error } = await supabase.from('stock_transfers').update({ status: 'SHIPPED' }).eq('id', id);
  if (error) { await supabase.from('stock_movements').delete().eq('ref_type', 'TRANSFER_OUT').eq('ref_id', id); return { error: error.message }; }
  refresh();
  return { success: true };
}

// Langkah 2: Gudang tujuan menerima. Stok tujuan bertambah, transfer selesai.
export async function receiveTransfer(id: string, receivedDate?: string) {
  { const denied = await guard('/dashboard/stock-transfer', 'edit'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: t } = await supabase.from('stock_transfers').select('id, doc_no, status, to_warehouse_id').eq('id', id).single();
  if (!t) return { error: 'Dokumen tidak ditemukan' };
  if (t.status !== 'SHIPPED') return { error: 'Hanya transfer berstatus Shipped yang dapat diterima.' };
  const date = receivedDate || new Date().toISOString().split('T')[0];
  const { data: items } = await supabase.from('stock_transfer_items').select('sku, qty, product_id').eq('transfer_id', id);
  const post = await postMovements(supabase, {
    warehouse_id: t.to_warehouse_id, date, ref_type: 'TRANSFER_IN', ref_id: id, ref_no: t.doc_no, reason: 'Transfer In', notes: null,
    items: (items ?? []).map((i) => ({ sku: i.sku as string, qty: Number(i.qty), product_id: (i.product_id as string | null) ?? null })),
  });
  if (post.error) return { error: post.error };
  const { error } = await supabase.from('stock_transfers').update({ status: 'COMPLETED', received_date: date }).eq('id', id);
  if (error) { await supabase.from('stock_movements').delete().eq('ref_type', 'TRANSFER_IN').eq('ref_id', id); return { error: error.message }; }
  refresh();
  return { success: true };
}

export async function deleteTransfer(id: string) {
  { const denied = await guard('/dashboard/stock-transfer', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: t } = await supabase.from('stock_transfers').select('status').eq('id', id).single();
  if (!t) return { error: 'Dokumen tidak ditemukan' };
  if (t.status !== 'DRAFT') return { error: 'Hanya transfer berstatus Draft yang dapat dihapus.' };
  const { error } = await supabase.from('stock_transfers').delete().eq('id', id);
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}
