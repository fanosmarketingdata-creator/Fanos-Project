'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getStockMap, postMovements } from '@/lib/stock';

function refresh() {
  ['purchase-delivery', 'purchase-orders', 'current-stock', 'stock-movement'].forEach((p) => revalidatePath('/dashboard/' + p));
}

// PO berstatus ORDERED yang masih bisa diterima barangnya.
export async function getPOsForReceipt() {
  const supabase = createClient();
  const { data } = await supabase.from('purchase_orders').select('id, doc_no, po_date, vendors(company)').eq('status', 'ORDERED').order('po_date', { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id as string, doc_no: (p.doc_no as string | null) ?? 'PO', po_date: p.po_date as string,
    vendor: (p.vendors as unknown as { company: string } | null)?.company ?? '-',
  }));
}

export type Receivable = { po_item_id: string; sku: string; name: string; uom: string; ordered: number; received: number; remaining: number };

export async function getPOReceivable(poId: string): Promise<Receivable[]> {
  const supabase = createClient();
  const { data: items } = await supabase.from('purchase_order_items').select('id, sku, description, qty, uom').eq('purchase_order_id', poId);
  const ids = (items ?? []).map((i) => i.id as string);
  const { data: got } = ids.length ? await supabase.from('purchase_delivery_items').select('po_item_id, qty_received').in('po_item_id', ids) : { data: [] as { po_item_id: string; qty_received: number }[] };
  const recv = new Map<string, number>();
  (got ?? []).forEach((g) => recv.set(g.po_item_id, (recv.get(g.po_item_id) ?? 0) + Number(g.qty_received)));
  const { data: prods } = await supabase.from('products').select('sku, name').in('sku', (items ?? []).map((i) => i.sku as string));
  const nameBy = new Map((prods ?? []).map((p) => [p.sku as string, p.name as string]));
  return (items ?? []).map((i) => {
    const r = recv.get(i.id as string) ?? 0;
    return {
      po_item_id: i.id as string, sku: i.sku as string, name: nameBy.get(i.sku as string) ?? ((i.description as string | null) || ''), uom: (i.uom as string | null) ?? '',
      ordered: Number(i.qty), received: r, remaining: Math.max(0, Number(i.qty) - r),
    };
  });
}

export type ReceiptInput = {
  doc_no?: string; gr_date: string; purchase_order_id: string; warehouse_id: string; vendor_do_no?: string; notes?: string;
  items: { po_item_id: string; sku: string; qty: number }[];
};

export async function createPurchaseDelivery(input: ReceiptInput) {
  { const denied = await guard('/dashboard/purchase-delivery', 'create'); if (denied) return { error: denied }; }
  if (!input.purchase_order_id) return { error: 'Mohon pilih Purchase Order terlebih dahulu.' };
  if (!input.warehouse_id) return { error: 'Mohon pilih Gudang penerima.' };
  if (!input.gr_date) return { error: 'Kolom Tanggal terima wajib diisi.' };
  const items = input.items.filter((i) => i.qty > 0);
  if (items.length === 0) return { error: 'Mohon isi minimal satu Qty diterima.' };

  const supabase = createClient();
  const { data: po } = await supabase.from('purchase_orders').select('id, status, vendor_id').eq('id', input.purchase_order_id).single();
  if (!po) return { error: 'Purchase Order tidak ditemukan.' };
  if (po.status !== 'ORDERED') return { error: 'Penerimaan hanya dapat dibuat dari PO berstatus ORDERED.' };

  const rec = await getPOReceivable(input.purchase_order_id);
  for (const it of items) {
    const m = rec.find((r) => r.po_item_id === it.po_item_id);
    if (!m) return { error: `Item ${it.sku} tidak ada di PO ini.` };
    if (it.qty > m.remaining) return { error: `Qty terima ${it.sku} melebihi sisa PO (${m.remaining}).` };
  }
  const { data: prods } = await supabase.from('products').select('id, sku').in('sku', items.map((i) => i.sku));
  const idBy = new Map((prods ?? []).map((p) => [p.sku as string, p.id as string]));

  const { data: gr, error } = await supabase
    .from('purchase_deliveries')
    .insert({ doc_no: input.doc_no?.trim() || null, gr_date: input.gr_date, purchase_order_id: input.purchase_order_id, vendor_id: po.vendor_id, warehouse_id: input.warehouse_id, vendor_do_no: input.vendor_do_no?.trim() || null, notes: input.notes?.trim() || null })
    .select('id, doc_no')
    .single();
  if (error) return { error: error.code === '23505' ? 'Delivery ID sudah digunakan.' : error.message };

  const { error: iErr } = await supabase.from('purchase_delivery_items').insert(
    items.map((i, n) => ({ purchase_delivery_id: gr.id, po_item_id: i.po_item_id, product_id: idBy.get(i.sku) ?? null, sku: i.sku, qty_received: i.qty, sort_order: n }))
  );
  if (iErr) { await supabase.from('purchase_deliveries').delete().eq('id', gr.id); return { error: iErr.message }; }

  const post = await postMovements(supabase, {
    warehouse_id: input.warehouse_id, date: input.gr_date, ref_type: 'PURCHASE_RECEIPT', ref_id: gr.id, ref_no: gr.doc_no, reason: 'Penerimaan Barang (Goods Receipt)', notes: input.vendor_do_no ? `SJ Vendor: ${input.vendor_do_no}` : null,
    items: items.map((i) => ({ sku: i.sku, qty: i.qty, product_id: idBy.get(i.sku) ?? null })),
  });
  if (post.error) { await supabase.from('purchase_deliveries').delete().eq('id', gr.id); return { error: post.error }; }

  // PO otomatis RECEIVED bila semua item sudah diterima penuh.
  const after = await getPOReceivable(input.purchase_order_id);
  if (after.every((r) => r.remaining <= 0)) await supabase.from('purchase_orders').update({ status: 'RECEIVED' }).eq('id', input.purchase_order_id);
  refresh();
  return { success: true };
}

// Hapus penerimaan: stok dibalik (ditolak bila barang sudah terpakai sehingga stok jadi minus).
export async function deletePurchaseDelivery(id: string) {
  { const denied = await guard('/dashboard/purchase-delivery', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: gr } = await supabase.from('purchase_deliveries').select('id, warehouse_id, purchase_order_id').eq('id', id).single();
  if (!gr) return { error: 'Dokumen tidak ditemukan' };
  const { data: mv } = await supabase.from('stock_movements').select('sku, qty').eq('ref_type', 'PURCHASE_RECEIPT').eq('ref_id', id);
  const stock = await getStockMap(supabase, gr.warehouse_id, (mv ?? []).map((m) => m.sku as string));
  for (const m of mv ?? []) {
    const after = (stock.get(m.sku as string) ?? 0) - Number(m.qty);
    if (after < 0) return { error: `Penerimaan tidak dapat dihapus: stok ${m.sku} akan menjadi minus (${after}). Barang sudah terpakai transaksi lain.` };
  }
  await supabase.from('stock_movements').delete().eq('ref_type', 'PURCHASE_RECEIPT').eq('ref_id', id);
  const { error } = await supabase.from('purchase_deliveries').delete().eq('id', id);
  if (error) return { error: error.message };
  await supabase.from('purchase_orders').update({ status: 'ORDERED' }).eq('id', gr.purchase_order_id).eq('status', 'RECEIVED');
  refresh();
  return { success: true };
}
