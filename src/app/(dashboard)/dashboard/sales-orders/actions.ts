'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import { sumDiscountPercent, sumChargeAmount } from '@/lib/discount-charge';

export type SOItemInput = {
  product_id: string | null;
  sku: string;
  qty: number;
  unit_price: number;
  notes?: string;
};

export type SalesOrderInput = {
  id?: string;
  mode: 'manual' | 'boq';
  so_date: string;
  boq_project_id?: string | null;
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

  const supabase = createClient();
  const total = validItems.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(input.discounts);
  const afterDiscount = total * (1 - discountPercent / 100);
  const grandTotal = afterDiscount + sumChargeAmount(input.charges);

  const headerPayload = {
    so_date: input.so_date,
    client_id: input.client_id,
    boq_project_id: input.mode === 'boq' ? input.boq_project_id : null,
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

// Server action dipanggil form "Dari BOQ Project" (SO langsung, tanpa quotation).
export async function getBOQItemsForSO(boqProjectId: string) {
  const supabase = createClient();
  const [{ data: items }, { data: boq }] = await Promise.all([
    supabase.from('boq_project_items').select('sku, qty, uom, product_id').eq('boq_project_id', boqProjectId),
    supabase.from('boq_projects').select('client_id').eq('id', boqProjectId).single(),
  ]);
  return { items: items ?? [], clientId: boq?.client_id ?? '' };
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

export async function shipItems(soId: string, doDate: string, shipItemsInput: ShipItemInput[]) {
  const toShip = shipItemsInput.filter((it) => it.ship_qty > 0);
  if (toShip.length === 0) return { error: 'Mohon isi minimal satu Ship Qty.' };

  const supabase = createClient();

  // Validasi: ship qty tidak boleh melebihi sisa
  const { data: soItems } = await supabase
    .from('sales_order_items')
    .select('id, sku, qty, qty_shipped')
    .eq('sales_order_id', soId);

  for (const ship of toShip) {
    const match = soItems?.find((si) => si.id === ship.sales_order_item_id);
    if (!match) continue;
    const remaining = Number(match.qty) - Number(match.qty_shipped);
    if (ship.ship_qty > remaining) {
      return { error: `Ship Qty untuk ${ship.sku} melebihi sisa (${remaining})` };
    }
  }

  const { data: deliveryOrder, error: doError } = await supabase
    .from('delivery_orders')
    .insert({ do_date: doDate, sales_order_id: soId, status: 'SHIPPED' })
    .select('id')
    .single();
  if (doError) return { error: doError.message };

  const doItemsRows = toShip.map((it) => ({
    delivery_order_id: deliveryOrder.id,
    sales_order_item_id: it.sales_order_item_id,
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
