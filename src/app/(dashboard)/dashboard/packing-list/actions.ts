'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function getVerifiedSalesOrders() {
  const supabase = createClient();
  const { data } = await supabase
    .from('sales_orders')
    .select('id, doc_no, so_date, clients(project_name)')
    .eq('status', 'VERIFIED')
    .order('so_date', { ascending: false });
  return (data ?? []).map((so) => ({
    id: so.id as string,
    doc_no: (so.doc_no as string | null) ?? '',
    so_date: so.so_date as string,
    client_name: (so.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));
}

const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;

// Item Sales Order + qty yang masih belum dimasukkan ke Packing List lain.
export async function getPackingItems(soId: string) {
  const supabase = createClient();
  const [{ data: so }, { data: items }, { data: packed }] = await Promise.all([
    supabase.from('sales_orders').select('id, clients(project_name, company, address, city)').eq('id', soId).single(),
    supabase.from('sales_order_items').select('sku, qty, sort_order, products(name, uom)').eq('sales_order_id', soId).order('sort_order'),
    supabase.from('packing_lists').select('packing_list_items(sku, qty)').eq('sales_order_id', soId),
  ]);
  if (!so) return null;
  const done = new Map<string, number>();
  (packed ?? []).forEach((pl) => ((pl.packing_list_items as unknown as { sku: string; qty: number }[]) ?? []).forEach((i) => done.set(i.sku, (done.get(i.sku) ?? 0) + Number(i.qty))));
  const c = one<{ project_name: string; company: string | null; address: string | null; city: string | null }>(so.clients);
  // SKU yang sama di beberapa baris SO digabung.
  const bySku = new Map<string, { sku: string; name: string; uom: string; qty: number }>();
  (items ?? []).forEach((it) => {
    const p = one<{ name: string; uom: string }>(it.products);
    const cur = bySku.get(it.sku as string);
    if (cur) cur.qty += Number(it.qty);
    else bySku.set(it.sku as string, { sku: it.sku as string, name: p?.name ?? '', uom: p?.uom ?? '', qty: Number(it.qty) });
  });
  return {
    client_name: c?.project_name ?? '-',
    address: [c?.address, c?.city].filter(Boolean).join(', '),
    items: Array.from(bySku.values()).map((i) => ({ ...i, packed: done.get(i.sku) ?? 0, remaining: Math.max(0, i.qty - (done.get(i.sku) ?? 0)) })),
  };
}

export type PackingInput = {
  so_id: string; doc_no?: string; pl_date: string; ship_to?: string; packed_by?: string; notes?: string;
  items: { sku: string; qty: number; colli: number; weight: number; remarks?: string }[];
};

export async function createPackingList(input: PackingInput) {
  if (!input.so_id) return { error: 'Mohon pilih Sales Order terlebih dahulu.' };
  if (!input.pl_date) return { error: 'Kolom Tanggal wajib diisi.' };
  const items = input.items.filter((i) => i.qty > 0);
  if (items.length === 0) return { error: 'Mohon isi minimal satu qty yang dikemas.' };

  const supabase = createClient();
  const info = await getPackingItems(input.so_id);
  if (!info) return { error: 'Sales Order tidak ditemukan' };
  const { data: so } = await supabase.from('sales_orders').select('client_id, status').eq('id', input.so_id).single();
  if (!so || so.status !== 'VERIFIED') return { error: 'Packing List hanya bisa dibuat dari Sales Order berstatus VERIFIED.' };
  for (const it of items) {
    const m = info.items.find((x) => x.sku === it.sku);
    if (!m) return { error: `SKU ${it.sku} tidak ada di Sales Order ini` };
    if (it.qty > m.remaining) return { error: `Qty ${it.sku} melebihi sisa yang belum dikemas (${m.remaining})` };
  }
  const { data: prods } = await supabase.from('products').select('id, sku').in('sku', items.map((i) => i.sku));
  const idBy = new Map((prods ?? []).map((p) => [p.sku as string, p.id as string]));

  const { data: pl, error } = await supabase
    .from('packing_lists')
    .insert({ doc_no: input.doc_no?.trim() || null, pl_date: input.pl_date, sales_order_id: input.so_id, client_id: so.client_id, ship_to: input.ship_to || null, packed_by: input.packed_by || null, notes: input.notes || null })
    .select('id')
    .single();
  if (error) return { error: error.code === '23505' ? 'Packing List ID sudah digunakan.' : error.message };
  const { error: iErr } = await supabase.from('packing_list_items').insert(
    items.map((i, n) => ({ packing_list_id: pl.id, product_id: idBy.get(i.sku) ?? null, sku: i.sku, qty: i.qty, colli: i.colli || 0, weight: i.weight || 0, remarks: i.remarks || null, sort_order: n }))
  );
  if (iErr) return { error: iErr.message };
  revalidatePath('/dashboard/packing-list');
  return { success: true, id: pl.id as string };
}

export async function deletePackingList(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('packing_lists').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/packing-list');
  return { success: true };
}
