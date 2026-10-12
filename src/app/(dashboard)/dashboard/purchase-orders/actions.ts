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
  items: POItemInput[];
};

export async function savePurchaseOrder(input: PurchaseOrderInput) {
  if (!input.vendor_id) return { error: 'Vendor wajib dipilih' };
  if (!input.po_date) return { error: 'Tanggal PO wajib diisi' };
  const validItems = input.items.filter((it) => it.sku && it.qty > 0);
  if (validItems.length === 0) return { error: 'Minimal 1 item harus ditambahkan' };

  const supabase = createClient();
  const header = { po_date: input.po_date, vendor_id: input.vendor_id, notes: input.notes || null };

  let poId = input.id;
  if (poId) {
    // Hanya PO berstatus DRAFT yang boleh diubah
    const { data: existing } = await supabase.from('purchase_orders').select('status').eq('id', poId).single();
    if (existing && existing.status !== 'DRAFT') return { error: 'PO yang sudah di-order tidak bisa diedit' };

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

  revalidatePath('/dashboard/purchase-orders');
  return { success: true, id: poId };
}

export async function deletePurchaseOrder(id: string) {
  const supabase = createClient();
  const { data: po } = await supabase.from('purchase_orders').select('status').eq('id', id).single();
  if (po && po.status === 'RECEIVED') return { error: 'PO yang sudah diterima tidak bisa dihapus' };

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
  if (!next) return { error: 'Status PO sudah final' };

  const { error } = await supabase.from('purchase_orders').update({ status: next }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/purchase-orders');
  return { success: true, status: next };
}
