'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import { sumDiscountPercent, sumChargeAmount } from '@/lib/discount-charge';

export type QuoteItemInput = {
  product_id: string | null;
  sku: string;
  description?: string;
  qty: number;
  uom: string;
  unit_price: number;
};

export type QuotationInput = {
  id?: string;
  mode: 'boq' | 'manual';
  quote_date: string;
  validity_date?: string;
  boq_project_id?: string | null;
  client_id: string;
  discounts: DiscountLine[];
  charges: ChargeLine[];
  items: QuoteItemInput[];
};

function computeTotals(items: QuoteItemInput[], discounts: DiscountLine[], charges: ChargeLine[]) {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(discounts);
  const afterDiscount = subtotal * (1 - discountPercent / 100);
  const total = afterDiscount + sumChargeAmount(charges);
  return { subtotal, total };
}

export async function saveQuotation(input: QuotationInput) {
  if (!input.client_id) return { error: 'Client wajib dipilih' };
  if (!input.quote_date) return { error: 'Tanggal Quotation wajib diisi' };
  const validItems = input.items.filter((it) => it.sku && it.qty > 0);
  if (validItems.length === 0) return { error: 'Minimal 1 item harus ditambahkan' };

  const supabase = createClient();
  const { subtotal, total } = computeTotals(validItems, input.discounts, input.charges);

  const headerPayload = {
    quote_date: input.quote_date,
    validity_date: input.validity_date || null,
    boq_project_id: input.mode === 'boq' ? input.boq_project_id : null,
    client_id: input.client_id,
    discounts: input.discounts,
    charges: input.charges,
    subtotal,
    total_amount: total,
  };

  let quoteId = input.id;
  if (quoteId) {
    const { error } = await supabase.from('quotations').update(headerPayload).eq('id', quoteId);
    if (error) return { error: error.message };
    const { error: delErr } = await supabase.from('quotation_items').delete().eq('quotation_id', quoteId);
    if (delErr) return { error: delErr.message };
  } else {
    const { data, error } = await supabase
      .from('quotations')
      .insert({ ...headerPayload, status: 'DRAFT' })
      .select('id')
      .single();
    if (error) return { error: error.message };
    quoteId = data.id;
  }

  const rows = validItems.map((it, i) => ({
    quotation_id: quoteId,
    product_id: it.product_id,
    sku: it.sku,
    description: it.description || null,
    qty: it.qty,
    uom: it.uom,
    unit_price: it.unit_price,
    subtotal: it.qty * it.unit_price,
    sort_order: i,
  }));
  const { error: itemsError } = await supabase.from('quotation_items').insert(rows);
  if (itemsError) return { error: itemsError.message };

  revalidatePath('/dashboard/quotations');
  return { success: true, id: quoteId };
}

// Dipanggil dari QuotationForm (client) saat mode "Dari BOQ Project" dan
// user memilih BOQ-nya — ambil seluruh item (flat, lintas Area/Sub-area)
// plus client_id BOQ itu supaya form bisa auto-isi Client.
export async function getBOQItemsForQuote(boqProjectId: string) {
  const supabase = createClient();
  const [{ data: items }, { data: boq }] = await Promise.all([
    supabase.from('boq_project_items').select('sku, qty, uom, product_id').eq('boq_project_id', boqProjectId),
    supabase.from('boq_projects').select('client_id').eq('id', boqProjectId).single(),
  ]);
  return { items: items ?? [], clientId: boq?.client_id ?? '' };
}

export async function deleteQuotation(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('quotations').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/quotations');
  return { success: true };
}

// ACCEPT quotation -> otomatis buat Sales Order dari item-itemnya.
export async function acceptQuotationAndCreateSO(quotationId: string) {
  const supabase = createClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', quotationId)
    .single();
  if (quoteError || !quote) return { error: quoteError?.message || 'Quotation tidak ditemukan' };
  if (quote.status !== 'DRAFT') return { error: 'Hanya quotation berstatus DRAFT yang bisa di-accept' };

  const { error: statusErr } = await supabase.from('quotations').update({ status: 'ACCEPTED' }).eq('id', quotationId);
  if (statusErr) return { error: statusErr.message };

  const discountPercent = sumDiscountPercent(quote.discounts as DiscountLine[]);

  const { data: so, error: soError } = await supabase
    .from('sales_orders')
    .insert({
      so_date: new Date().toISOString().split('T')[0],
      client_id: quote.client_id,
      quotation_id: quote.id,
      boq_project_id: quote.boq_project_id,
      status: 'DRAFT',
      discount_percent: discountPercent,
      discounts: quote.discounts,
      charges: quote.charges,
      total_amount: quote.total_amount,
      source_type: 'quotation',
      source_ref: quote.id,
    })
    .select('id')
    .single();
  if (soError) return { error: soError.message };

  type QItem = { product_id: string | null; sku: string; qty: number; uom: string; unit_price: number };
  const items = (quote.quotation_items as QItem[]) ?? [];
  const soItems = items.map((it, i) => ({
    sales_order_id: so.id,
    product_id: it.product_id,
    sku: it.sku,
    qty: it.qty,
    unit_price: it.unit_price,
    total: it.qty * it.unit_price,
    sort_order: i,
  }));
  const { error: soItemsErr } = await supabase.from('sales_order_items').insert(soItems);
  if (soItemsErr) return { error: soItemsErr.message };

  revalidatePath('/dashboard/quotations');
  revalidatePath('/dashboard/sales-orders');
  return { success: true, soId: so.id };
}
