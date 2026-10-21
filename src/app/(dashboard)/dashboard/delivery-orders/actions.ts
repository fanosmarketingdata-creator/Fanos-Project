'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Sales Order yang masih punya sisa barang untuk dikirim.
export async function getSalesOrdersForDelivery() {
  const supabase = createClient();
  const { data } = await supabase
    .from('sales_orders')
    .select('id, doc_no, so_date, status, clients(project_name)')
    .neq('status', 'COMPLETED')
    .order('so_date', { ascending: false });
  return (data ?? []).map((so) => ({
    id: so.id,
    doc_no: (so.doc_no as string | null) ?? '',
    so_date: so.so_date as string,
    client_name: (so.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));
}

export type ManualDOItem = { product_id: string | null; sku: string; qty: number; notes?: string };

// Delivery Order langsung (tanpa Sales Order): client + item dipilih manual.
export async function createManualDelivery(input: { doc_no?: string; do_date: string; client_id: string; notes?: string; items: ManualDOItem[] }) {
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
