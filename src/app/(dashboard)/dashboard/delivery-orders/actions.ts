'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncSalesOrder, shipItems } from '../sales-orders/actions';
import type { SOEdits } from '@/lib/so-types';

// Sales Order yang masih punya sisa barang untuk dikirim.
export async function getSalesOrdersForDelivery() {
  const supabase = createClient();
  const { data } = await supabase
    .from('sales_orders')
    .select('id, doc_no, so_date, status, clients(project_name)')
    .eq('status', 'VERIFIED')
    .order('so_date', { ascending: false });
  return (data ?? []).map((so) => ({
    id: so.id,
    doc_no: (so.doc_no as string | null) ?? '',
    so_date: so.so_date as string,
    client_name: (so.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));
}

// Delivery Order dari Sales Order. Bila item/diskon/biaya diubah di form, Sales Order ikut diperbarui lebih dulu.
export async function createDeliveryFromSO(input: {
  so_id: string;
  doc_no?: string;
  do_date: string;
  notes?: string;
  warehouse_id?: string;
  edits?: SOEdits;
  ship: { sales_order_item_id: string; sku: string; ship_qty: number }[];
}) {
  { const denied = await guard('/dashboard/delivery-orders', 'create'); if (denied) return { error: denied }; }
  if (!input.so_id) return { error: 'Mohon pilih Sales Order terlebih dahulu.' };
  if (!input.do_date) return { error: 'Kolom Tanggal kirim wajib diisi.' };
  if (input.edits) {
    const synced = await syncSalesOrder(input.so_id, input.edits);
    if (synced.error) return { error: synced.error };
  }
  const r = await shipItems(input.so_id, input.do_date, input.ship, input.doc_no, input.notes, input.warehouse_id);
  revalidatePath('/dashboard/delivery-orders');
  return r;
}

export type ManualDOItem = { product_id: string | null; sku: string; qty: number; notes?: string };

// Delivery Order langsung (tanpa Sales Order): client + item dipilih manual.
export async function createManualDelivery(input: { doc_no?: string; do_date: string; client_id: string; notes?: string; warehouse_id?: string; items: ManualDOItem[] }) {
  { const denied = await guard('/dashboard/delivery-orders', 'create'); if (denied) return { error: denied }; }
  if (!input.client_id) return { error: 'Mohon pilih Client terlebih dahulu.' };
  if (!input.do_date) return { error: 'Kolom Tanggal kirim wajib diisi.' };
  const items = input.items.filter((it) => it.sku && it.qty > 0);
  if (items.length === 0) return { error: 'Minimal satu item harus ditambahkan.' };

  const supabase = createClient();
  const { data: d, error } = await supabase
    .from('delivery_orders')
    .insert({
      doc_no: input.doc_no?.trim() || null,
      do_date: input.do_date,
      client_id: input.client_id,
      sales_order_id: null,
      notes: input.notes?.trim() || null,
      status: 'SHIPPED',
      warehouse_id: input.warehouse_id || null,
    })
    .select('id')
    .single();
  if (error) return { error: error.code === '23505' ? 'Delivery ID sudah digunakan oleh pengiriman lain.' : error.message };

  const { error: itemsErr } = await supabase.from('delivery_order_items').insert(
    items.map((it) => ({ delivery_order_id: d.id, product_id: it.product_id, sku: it.sku, qty_shipped: it.qty, notes: it.notes?.trim() || null }))
  );
  if (itemsErr) {
    await supabase.from('delivery_orders').delete().eq('id', d.id);
    return { error: itemsErr.message };
  }

  revalidatePath('/dashboard/delivery-orders');
  return { success: true, id: d.id };
}
