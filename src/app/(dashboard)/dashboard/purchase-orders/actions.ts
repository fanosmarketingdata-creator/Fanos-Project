'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type POItemInput = {
  sku: string;
  description?: string;
  qty: number;
  uom: string;
  unit_price: number;
};

export type PurchaseOrderInput = {
  id?: string;
  po_date: string;
  vendor_id: string;
  notes?: string;
  sales_order_id?: string | null;
  items: POItemInput[];
};

export async function savePurchaseOrder(input: PurchaseOrderInput) {
  if (!input.vendor_id) return { error: 'Mohon pilih Vendor terlebih dahulu.' };
  if (!input.po_date) return { error: 'Kolom Tanggal PO wajib diisi.' };
  const validItems = input.items.filter((it) => it.sku && it.qty > 0);
  if (validItems.length === 0) return { error: 'Minimal satu item harus ditambahkan.' };

  const supabase = createClient();
  const header = { po_date: input.po_date, vendor_id: input.vendor_id, notes: input.notes || null };

  let poId = input.id;
  if (poId) {
    // Hanya PO berstatus DRAFT yang boleh diubah
    const { data: existing } = await supabase.from('purchase_orders').select('status').eq('id', poId).single();
    if (existing && existing.status !== 'DRAFT') return { error: 'PO yang telah di-order tidak dapat diubah.' };

    const { error } = await supabase.from('purchase_orders').update(header).eq('id', poId);
    if (error) return { error: error.message };
    const { error: delErr } = await supabase.from('purchase_order_items').delete().eq('purchase_order_id', poId);
    if (delErr) return { error: delErr.message };
  } else {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({ ...header, status: 'DRAFT' })
      .select('id')
      .single();
    if (error) return { error: error.message };
    poId = data.id;
  }

  const rows = validItems.map((it) => ({
    purchase_order_id: poId,
    sku: it.sku,
    description: it.description || null,
    qty: it.qty,
    uom: it.uom,
    unit_price: it.unit_price,
    subtotal: it.qty * it.unit_price,
  }));
  const { error: itemsErr } = await supabase.from('purchase_order_items').insert(rows);
  if (itemsErr) return { error: itemsErr.message };

  if (input.sales_order_id) await supabase.from('purchase_orders').update({ sales_order_id: input.sales_order_id }).eq('id', poId); // abaikan bila migrasi 0029 belum dijalankan
  revalidatePath('/dashboard/purchase-orders');
  return { success: true, id: poId };
}

export async function deletePurchaseOrder(id: string) {
  const supabase = createClient();
  const { data: po } = await supabase.from('purchase_orders').select('status').eq('id', id).single();
  if (po && po.status === 'RECEIVED') return { error: 'PO yang telah diterima tidak dapat dihapus.' };

  const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/purchase-orders');
  return { success: true };
}

// DRAFT -> ORDERED -> RECEIVED (hanya maju satu langkah, tidak bisa mundur)
export async function advancePOStatus(id: string) {
  const supabase = createClient();
  const { data: po } = await supabase.from('purchase_orders').select('status').eq('id', id).single();
  if (!po) return { error: 'PO tidak ditemukan' };

  const next = po.status === 'DRAFT' ? 'ORDERED' : po.status === 'ORDERED' ? 'RECEIVED' : null;
  if (!next) return { error: 'Status PO telah final.' };

  const { error } = await supabase.from('purchase_orders').update({ status: next }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/purchase-orders');
  return { success: true, status: next };
}

// Tarik item dari Sales Order ke PO: SKU yang sama digabung; harga beli dari Product Catalogue.
export async function getSOItemsForPO(soId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('sales_order_items')
    .select('sku, qty, uom, products(name, cost_price, uom)')
    .eq('sales_order_id', soId)
    .order('sort_order');
  const by = new Map<string, POItemInput>();
  (data ?? []).forEach((r) => {
    const raw = r.products as unknown;
    const p = (Array.isArray(raw) ? raw[0] : raw) as { name?: string; cost_price?: number; uom?: string } | null;
    const cur = by.get(r.sku as string);
    if (cur) cur.qty += Number(r.qty);
    else by.set(r.sku as string, { sku: r.sku as string, description: p?.name ?? '', qty: Number(r.qty), uom: (r.uom as string) || p?.uom || 'Pcs', unit_price: Number(p?.cost_price) || 0 });
  });
  return Array.from(by.values());
}
