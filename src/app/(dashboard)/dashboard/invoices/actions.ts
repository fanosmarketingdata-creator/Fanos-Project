'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import { syncSalesOrder } from '../sales-orders/actions';
import type { SOEdits } from '@/lib/so-types';
import { sumDiscountPercent, sumChargeAmount, sumTaxAmount } from '@/lib/discount-charge';

// Daftar SO yang BELUM punya invoice (supaya tidak invoice dobel per SO).
export async function getUninvoicedSalesOrders() {
  const supabase = createClient();
  const { data: sos } = await supabase
    .from('sales_orders')
    .select('id, doc_no, so_date, total_amount, clients(project_name), invoices(id)')
    .in('status', ['VERIFIED', 'COMPLETED']);

  return (sos ?? [])
    .filter((so) => !(so.invoices as unknown as { id: string }[])?.length)
    .map((so) => ({
      id: so.id,
      doc_no: (so.doc_no as string | null) ?? null,
      so_date: so.so_date,
      total_amount: Number(so.total_amount),
      client_name: (so.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    }));
}

export async function getSOForInvoice(soId: string) {
  const supabase = createClient();
  const { data: so } = await supabase
    .from('sales_orders')
    .select('id, client_id, discounts, charges, sales_order_items(product_id, sku, qty, unit_price)')
    .eq('id', soId)
    .single();
  return so;
}

export type InvoiceInput = {
  so_id: string;
  inv_date: string;
  doc_no?: string; // Invoice ID manual; kosong = otomatis
  edits?: SOEdits; // perubahan item/diskon/biaya dari form; disimpan juga ke Sales Order
};

export async function createInvoiceFromSO(input: InvoiceInput) {
  if (!input.so_id) return { error: 'Mohon pilih Sales Order terlebih dahulu.' };
  if (!input.inv_date) return { error: 'Kolom Tanggal Invoice wajib diisi.' };

  const supabase = createClient();
  if (input.edits) {
    const synced = await syncSalesOrder(input.so_id, input.edits);
    if (synced.error) return { error: synced.error };
  }
  const so = await getSOForInvoice(input.so_id);
  if (!so) return { error: 'Sales Order tidak ditemukan' };

  type SOItem = { product_id: string | null; sku: string; qty: number; unit_price: number };
  const items = (so.sales_order_items as SOItem[]) ?? [];
  if (items.length === 0) return { error: 'Sales Order ini tidak memiliki item.' };

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(so.discounts as DiscountLine[]);
  const afterDiscount = subtotal * (1 - discountPercent / 100);
  const grandTotal = afterDiscount + sumChargeAmount(so.charges as ChargeLine[]) + sumTaxAmount(subtotal, so.discounts as DiscountLine[]);

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      doc_no: input.doc_no?.trim() || null,
      inv_date: input.inv_date,
      sales_order_id: so.id,
      client_id: so.client_id,
      status: 'UNPAID',
      discount_percent: discountPercent,
      discounts: so.discounts,
      charges: so.charges,
      grand_total: grandTotal,
      total_paid: 0,
      remaining: grandTotal,
    })
    .select('id')
    .single();
  if (invError) return { error: invError.code === '23505' ? 'Invoice ID sudah digunakan oleh invoice lain.' : invError.message };

  const rows = items.map((it) => ({
    invoice_id: invoice.id,
    product_id: it.product_id,
    sku: it.sku,
    qty: it.qty,
    unit_price: it.unit_price,
    total: it.qty * it.unit_price,
  }));
  const { error: itemsErr } = await supabase.from('invoice_items').insert(rows);
  if (itemsErr) return { error: itemsErr.message };

  revalidatePath('/dashboard/invoices');
  return { success: true, id: invoice.id };
}

export async function deleteInvoice(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/invoices');
  return { success: true };
}

// ------------------------------------------------------------
// PAYMENTS — tercatat per invoice, total_paid & remaining dihitung ulang.
// ------------------------------------------------------------
