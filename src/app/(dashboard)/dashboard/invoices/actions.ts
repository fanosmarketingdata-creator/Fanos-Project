'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { DiscountLine, ChargeLine } from '@/components/DiscountChargeEditor';
import { sumDiscountPercent, sumChargeAmount } from '@/components/DiscountChargeEditor';

// Daftar SO yang BELUM punya invoice (supaya tidak invoice dobel per SO).
export async function getUninvoicedSalesOrders() {
  const supabase = createClient();
  const { data: sos } = await supabase
    .from('sales_orders')
    .select('id, so_date, total_amount, clients(project_name), invoices(id)')
    .in('status', ['ONGOING', 'COMPLETED']);

  return (sos ?? [])
    .filter((so) => !(so.invoices as unknown as { id: string }[])?.length)
    .map((so) => ({
      id: so.id,
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
};

export async function createInvoiceFromSO(input: InvoiceInput) {
  if (!input.so_id) return { error: 'Sales Order wajib dipilih' };
  if (!input.inv_date) return { error: 'Tanggal Invoice wajib diisi' };

  const supabase = createClient();
  const so = await getSOForInvoice(input.so_id);
  if (!so) return { error: 'Sales Order tidak ditemukan' };

  type SOItem = { product_id: string | null; sku: string; qty: number; unit_price: number };
  const items = (so.sales_order_items as SOItem[]) ?? [];
  if (items.length === 0) return { error: 'Sales Order ini tidak punya item' };

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(so.discounts as DiscountLine[]);
  const afterDiscount = subtotal * (1 - discountPercent / 100);
  const grandTotal = afterDiscount + sumChargeAmount(so.charges as ChargeLine[]);

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
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
  if (invError) return { error: invError.message };

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
export async function recordPayment(invoiceId: string, payDate: string, amount: number, method: string, referenceNo?: string, notes?: string) {
  if (amount <= 0) return { error: 'Jumlah pembayaran harus lebih dari 0' };

  const supabase = createClient();
  const { data: invoice } = await supabase.from('invoices').select('grand_total, total_paid').eq('id', invoiceId).single();
  if (!invoice) return { error: 'Invoice tidak ditemukan' };

  const newTotalPaid = Number(invoice.total_paid) + amount;
  if (newTotalPaid > Number(invoice.grand_total)) {
    return { error: `Jumlah pembayaran melebihi sisa tagihan (Rp ${(Number(invoice.grand_total) - Number(invoice.total_paid)).toLocaleString('id-ID')})` };
  }

  const { error: payError } = await supabase.from('payments').insert({
    invoice_id: invoiceId,
    pay_date: payDate,
    amount,
    method,
    reference_no: referenceNo || null,
    notes: notes || null,
  });
  if (payError) return { error: payError.message };

  const newRemaining = Number(invoice.grand_total) - newTotalPaid;
  const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

  const { error: updErr } = await supabase
    .from('invoices')
    .update({ total_paid: newTotalPaid, remaining: newRemaining, status: newStatus })
    .eq('id', invoiceId);
  if (updErr) return { error: updErr.message };

  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/payments');
  revalidatePath('/dashboard/outstanding');
  return { success: true };
}
