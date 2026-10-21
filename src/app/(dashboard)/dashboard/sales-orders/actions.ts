'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import { sumDiscountPercent, sumChargeAmount, sumTaxAmount } from '@/lib/discount-charge';

export type SOItemInput = {
  product_id: string | null;
  sku: string;
  qty: number;
  unit_price: number;
  notes?: string;
};

export type SalesOrderInput = {
  id?: string;
  mode: 'quotation' | 'manual';
  so_date: string;
  quotation_id?: string | null;
  client_id: string;
  discounts: DiscountLine[];
  charges: ChargeLine[];
  global_notes?: string;
  items: SOItemInput[];
};

export async function saveSalesOrder(input: SalesOrderInput) {
  if (!input.client_id) return { error: 'Mohon pilih Client terlebih dahulu.' };
  if (!input.so_date) return { error: 'Kolom Tanggal SO wajib diisi.' };
  const validItems = input.items.filter((it) => it.sku && it.qty > 0);
  if (validItems.length === 0) return { error: 'Minimal satu item harus ditambahkan.' };

  if (input.mode === 'quotation' && !input.quotation_id) return { error: 'Mohon pilih Quotation terlebih dahulu.' };

  const supabase = createClient();
  let boqProjectId: string | null = null;
  if (input.mode === 'quotation' && input.quotation_id) {
    const { data: q } = await supabase.from('quotations').select('boq_project_id').eq('id', input.quotation_id).single();
    boqProjectId = q?.boq_project_id ?? null;
  }
  const total = validItems.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(input.discounts);
  const afterDiscount = total * (1 - discountPercent / 100);
  const grandTotal = afterDiscount + sumChargeAmount(input.charges) + sumTaxAmount(total, input.discounts);

  const headerPayload = {
    so_date: input.so_date,
    client_id: input.client_id,
    quotation_id: input.mode === 'quotation' ? input.quotation_id : null,
    boq_project_id: boqProjectId,
    discount_percent: discountPercent,
    discounts: input.discounts,
    charges: input.charges,
    total_amount: grandTotal,
    global_notes: input.global_notes || null,
    source_type: input.mode,
  };

  let soId = input.id;
  if (soId) {
    const { error } = await supabase.from('sales_orders').update(headerPayload).eq('id', soId);
    if (error) return { error: error.message };
    const { error: delErr } = await supabase.from('sales_order_items').delete().eq('sales_order_id', soId);
    if (delErr) return { error: delErr.message };
  } else {
    const { data, error } = await supabase
      .from('sales_orders')
      .insert({ ...headerPayload, status: 'DRAFT' })
      .select('id')
      .single();
    if (error) return { error: error.message };
    soId = data.id;
  }

  const rows = validItems.map((it, i) => ({
    sales_order_id: soId,
    product_id: it.product_id,
    sku: it.sku,
    qty: it.qty,
    unit_price: it.unit_price,
    total: it.qty * it.unit_price,
    notes: it.notes || null,
    sort_order: i,
  }));
  const { error: itemsErr } = await supabase.from('sales_order_items').insert(rows);
  if (itemsErr) return { error: itemsErr.message };

  if (input.mode === 'quotation' && input.quotation_id) {
    await supabase.from('quotations').update({ status: 'ACCEPTED' }).eq('id', input.quotation_id).eq('status', 'DRAFT');
    revalidatePath('/dashboard/quotations');
  }

  revalidatePath('/dashboard/sales-orders');
  return { success: true, id: soId };
}

export async function deleteSalesOrder(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('sales_orders').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/sales-orders');
  return { success: true };
}

// Server action dipanggil form "Dari Quotation": ambil client, item, diskon/pajak dan biaya tambahan.
export async function getQuotationForSO(quotationId: string) {
  const supabase = createClient();
  const { data: q } = await supabase
    .from('quotations')
    .select('client_id, discounts, charges, quotation_items(product_id, sku, qty, unit_price, sort_order)')
    .eq('id', quotationId)
    .single();
  if (!q) return { error: 'Quotation tidak ditemukan' as const };
  const items = ((q.quotation_items as { product_id: string | null; sku: string; qty: number; unit_price: number; sort_order: number | null }[]) ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((it) => ({ product_id: it.product_id, sku: it.sku, qty: Number(it.qty), unit_price: Number(it.unit_price) }));
  return { clientId: q.client_id as string, items, discounts: (q.discounts ?? []) as DiscountLine[], charges: (q.charges ?? []) as ChargeLine[] };
}

// ------------------------------------------------------------
// SHIP ITEMS — buat Delivery Order dari sebagian/seluruh sisa qty SO.
// ------------------------------------------------------------
export type ShipItemInput = { sales_order_item_id: string; sku: string; ship_qty: number; notes?: string };

export async function getSOShippingStatus(soId: string) {
  const supabase = createClient();
  const { data: items } = await supabase
    .from('sales_order_items')
    .select('id, sku, qty, qty_shipped, products(name)')
    .eq('sales_order_id', soId);

  return (items ?? []).map((it) => ({
    id: it.id,
    sku: it.sku,
    name: (it.products as unknown as { name: string } | null)?.name ?? '',
    ordered: Number(it.qty),
    shipped: Number(it.qty_shipped),
    remaining: Number(it.qty) - Number(it.qty_shipped),
  }));
}

export async function shipItems(soId: string, doDate: string, shipItemsInput: ShipItemInput[], docNo?: string, doNotes?: string) {
  const toShip = shipItemsInput.filter((it) => it.ship_qty > 0);
  if (toShip.length === 0) return { error: 'Mohon isi minimal satu Ship Qty.' };

  const supabase = createClient();

  // Validasi: ship qty tidak boleh melebihi sisa
  const { data: soItems } = await supabase
    .from('sales_order_items')
    .select('id, sku, qty, qty_shipped, product_id')
    .eq('sales_order_id', soId);

  for (const ship of toShip) {
    const match = soItems?.find((si) => si.id === ship.sales_order_item_id);
    if (!match) continue;
    const remaining = Number(match.qty) - Number(match.qty_shipped);
    if (ship.ship_qty > remaining) {
      return { error: `Ship Qty untuk ${ship.sku} melebihi sisa (${remaining})` };
    }
  }

  const { data: soHead } = await supabase.from('sales_orders').select('client_id').eq('id', soId).single();
  const soClientId = soHead?.client_id ?? null;

  const { data: deliveryOrder, error: doError } = await supabase
    .from('delivery_orders')
    .insert({ doc_no: docNo?.trim() || null, do_date: doDate, sales_order_id: soId, client_id: soClientId, notes: doNotes?.trim() || null, status: 'SHIPPED' })
    .select('id')
    .single();
  if (doError) return { error: doError.code === '23505' ? 'Delivery ID sudah digunakan oleh pengiriman lain.' : doError.message };

  const doItemsRows = toShip.map((it) => ({
    delivery_order_id: deliveryOrder.id,
    sales_order_item_id: it.sales_order_item_id,
    product_id: soItems?.find((si) => si.id === it.sales_order_item_id)?.product_id ?? null,
    sku: it.sku,
    qty_shipped: it.ship_qty,
    notes: it.notes || null,
  }));
  const { error: doItemsErr } = await supabase.from('delivery_order_items').insert(doItemsRows);
  if (doItemsErr) return { error: doItemsErr.message };

  // Update qty_shipped akumulatif di tiap sales_order_item
  for (const ship of toShip) {
    const match = soItems?.find((si) => si.id === ship.sales_order_item_id);
    if (!match) continue;
    const newShipped = Number(match.qty_shipped) + ship.ship_qty;
    const { error: updErr } = await supabase
      .from('sales_order_items')
      .update({ qty_shipped: newShipped })
      .eq('id', ship.sales_order_item_id);
    if (updErr) return { error: updErr.message };
  }

  // Kalau semua item sudah terkirim penuh, naikkan status SO jadi COMPLETED
  const { data: refreshed } = await supabase.from('sales_order_items').select('qty, qty_shipped').eq('sales_order_id', soId);
  const allShipped = (refreshed ?? []).every((it) => Number(it.qty_shipped) >= Number(it.qty));
  if (allShipped) {
    await supabase.from('sales_orders').update({ status: 'COMPLETED' }).eq('id', soId);
  } else {
    await supabase.from('sales_orders').update({ status: 'ONGOING' }).eq('id', soId);
  }

  revalidatePath('/dashboard/sales-orders');
  revalidatePath('/dashboard/delivery-orders');
  return { success: true, deliveryOrderId: deliveryOrder.id };
}
