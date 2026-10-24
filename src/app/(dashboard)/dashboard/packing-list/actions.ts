'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calcCbm } from '@/lib/packing';

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
    supabase.from('sales_order_items').select('sku, qty, sort_order, products(name, uom, package_type, units_per_package, net_weight, gross_weight, pkg_length_cm, pkg_width_cm, pkg_height_cm)').eq('sales_order_id', soId).order('sort_order'),
    supabase.from('packing_lists').select('packing_list_items(sku, qty)').eq('sales_order_id', soId),
  ]);
  if (!so) return null;
  const done = new Map<string, number>();
  (packed ?? []).forEach((pl) => ((pl.packing_list_items as unknown as { sku: string; qty: number }[]) ?? []).forEach((i) => done.set(i.sku, (done.get(i.sku) ?? 0) + Number(i.qty))));
  const c = one<{ project_name: string; company: string | null; address: string | null; city: string | null }>(so.clients);
  // SKU yang sama di beberapa baris SO digabung.
  type Pack = { package_type: string; units_per_package: number; net_weight: number; gross_weight: number; l: number; w: number; h: number };
  const bySku = new Map<string, { sku: string; name: string; uom: string; qty: number; pack: Pack }>();
  (items ?? []).forEach((it) => {
    const p = one<{ name: string; uom: string; package_type: string | null; units_per_package: number; net_weight: number; gross_weight: number; pkg_length_cm: number; pkg_width_cm: number; pkg_height_cm: number }>(it.products);
    const cur = bySku.get(it.sku as string);
    if (cur) cur.qty += Number(it.qty);
    else bySku.set(it.sku as string, { sku: it.sku as string, name: p?.name ?? '', uom: p?.uom ?? '', qty: Number(it.qty), pack: { package_type: p?.package_type || 'Carton', units_per_package: Number(p?.units_per_package) || 0, net_weight: Number(p?.net_weight) || 0, gross_weight: Number(p?.gross_weight) || 0, l: Number(p?.pkg_length_cm) || 0, w: Number(p?.pkg_width_cm) || 0, h: Number(p?.pkg_height_cm) || 0 } });
  });
  return {
    client_name: c?.project_name ?? '-',
    address: [c?.address, c?.city].filter(Boolean).join(', '),
    items: Array.from(bySku.values()).map((i) => ({ ...i, packed: done.get(i.sku) ?? 0, remaining: Math.max(0, i.qty - (done.get(i.sku) ?? 0)) })),
  };
}

export type PackingLine = {
  sku: string; package_type: string; packages: number; units_per_package: number;
  net_weight: number; gross_weight: number; length_cm: number; width_cm: number; height_cm: number; remarks?: string;
};
export type PackingInput = { so_id: string; doc_no?: string; pl_date: string; ship_to?: string; packed_by?: string; notes?: string; items: PackingLine[] };

export async function createPackingList(input: PackingInput) {
  if (!input.so_id) return { error: 'Mohon pilih Sales Order terlebih dahulu.' };
  if (!input.pl_date) return { error: 'Kolom Tanggal wajib diisi.' };
  // Total Qty baris = jumlah kemasan x unit per kemasan (dihitung ulang di server).
  const items = input.items.map((i) => ({ ...i, qty: Number(i.packages) * Number(i.units_per_package) })).filter((i) => i.sku && i.qty > 0);
  if (items.length === 0) return { error: 'Mohon isi minimal satu baris dengan jumlah kemasan dan unit per kemasan.' };
  if (items.some((i) => !i.package_type)) return { error: 'Jenis kemasan wajib diisi pada setiap baris.' };

  const supabase = createClient();
  const info = await getPackingItems(input.so_id);
  if (!info) return { error: 'Sales Order tidak ditemukan' };
  const { data: so } = await supabase.from('sales_orders').select('client_id, status').eq('id', input.so_id).single();
  if (!so || so.status !== 'VERIFIED') return { error: 'Packing List hanya bisa dibuat dari Sales Order berstatus VERIFIED.' };
  const sumBySku = new Map<string, number>();
  items.forEach((i) => sumBySku.set(i.sku, (sumBySku.get(i.sku) ?? 0) + i.qty));
  for (const [sku, q] of Array.from(sumBySku.entries())) {
    const m = info.items.find((x) => x.sku === sku);
    if (!m) return { error: `SKU ${sku} tidak ada di Sales Order ini` };
    if (q > m.remaining + 0.0001) return { error: `Total qty ${sku} (${q}) melebihi sisa yang belum dikemas (${m.remaining})` };
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
    items.map((i, n) => ({
      packing_list_id: pl.id, product_id: idBy.get(i.sku) ?? null, sku: i.sku, qty: i.qty,
      package_type: i.package_type, colli: i.packages, units_per_package: i.units_per_package,
      net_weight: i.net_weight || 0, gross_weight: i.gross_weight || 0, weight: i.gross_weight || 0,
      length_cm: i.length_cm || 0, width_cm: i.width_cm || 0, height_cm: i.height_cm || 0,
      cbm: calcCbm(i.length_cm || 0, i.width_cm || 0, i.height_cm || 0, i.packages),
      remarks: i.remarks || null, sort_order: n,
    }))
  );
  if (iErr) { await supabase.from('packing_lists').delete().eq('id', pl.id); return { error: iErr.message }; }
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
