'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncPurchaseInvoice } from '@/lib/purchase-sync';

function refresh() {
  ['purchase-invoice', 'purchase-payment'].forEach((p) => revalidatePath('/dashboard/' + p));
}

// PO yang sudah di-order / diterima dan dapat ditagihkan.
export async function getPOsForInvoice() {
  const supabase = createClient();
  const { data } = await supabase.from('purchase_orders').select('id, doc_no, po_date, status, vendors(company)').in('status', ['ORDERED', 'RECEIVED']).order('po_date', { ascending: false });
  return (data ?? []).map((p) => ({
    id: p.id as string, doc_no: (p.doc_no as string | null) ?? 'PO', po_date: p.po_date as string, status: p.status as string,
    vendor: (p.vendors as unknown as { company: string } | null)?.company ?? '-',
  }));
}

export type InvoiceLine = { po_item_id: string; sku: string; description: string; qty: number; uom: string; unit_price: number };

export async function getPOLinesForInvoice(poId: string): Promise<{ vendor_id: string; terms: string; lines: InvoiceLine[] } | null> {
  const supabase = createClient();
  const [{ data: po }, { data: items }] = await Promise.all([
    supabase.from('purchase_orders').select('vendor_id').eq('id', poId).single(),
    supabase.from('purchase_order_items').select('id, sku, description, qty, uom, unit_price').eq('purchase_order_id', poId),
  ]);
  if (!po) return null;
  const { data: v } = await supabase.from('vendors').select('top').eq('id', po.vendor_id).single();
  return {
    vendor_id: po.vendor_id as string, terms: (v?.top as string | null) ?? '',
    lines: (items ?? []).map((i) => ({ po_item_id: i.id as string, sku: i.sku as string, description: (i.description as string | null) ?? '', qty: Number(i.qty), uom: (i.uom as string | null) ?? '', unit_price: Number(i.unit_price) })),
  };
}

export type PurchaseInvoiceInput = {
  doc_no?: string; inv_date: string; due_date?: string; purchase_order_id: string; vendor_invoice_no?: string;
  discount_percent: number; tax_percent: number; notes?: string; lines: InvoiceLine[];
};

export async function createPurchaseInvoice(input: PurchaseInvoiceInput) {
  { const denied = await guard('/dashboard/purchase-invoice', 'create'); if (denied) return { error: denied }; }
  if (!input.purchase_order_id) return { error: 'Mohon pilih Purchase Order terlebih dahulu.' };
  if (!input.inv_date) return { error: 'Kolom Tanggal Invoice wajib diisi.' };
  const lines = input.lines.filter((l) => l.sku && l.qty > 0);
  if (lines.length === 0) return { error: 'Minimal satu item dengan qty lebih dari 0.' };
  if (input.discount_percent < 0 || input.discount_percent > 100 || input.tax_percent < 0) return { error: 'Persentase diskon / pajak tidak valid.' };

  const supabase = createClient();
  const { data: po } = await supabase.from('purchase_orders').select('vendor_id, status').eq('id', input.purchase_order_id).single();
  if (!po || po.status === 'DRAFT') return { error: 'Invoice hanya dapat dibuat dari PO yang sudah di-order.' };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const disc = (subtotal * input.discount_percent) / 100;
  const tax = ((subtotal - disc) * input.tax_percent) / 100;
  const grand = Math.round(subtotal - disc + tax);

  const { data: prods } = await supabase.from('products').select('id, sku').in('sku', lines.map((l) => l.sku));
  const idBy = new Map((prods ?? []).map((p) => [p.sku as string, p.id as string]));

  const { data: inv, error } = await supabase
    .from('purchase_invoices')
    .insert({
      doc_no: input.doc_no?.trim() || null, inv_date: input.inv_date, due_date: input.due_date || null, purchase_order_id: input.purchase_order_id, vendor_id: po.vendor_id,
      vendor_invoice_no: input.vendor_invoice_no?.trim() || null, discount_percent: input.discount_percent, tax_percent: input.tax_percent,
      subtotal, grand_total: grand, remaining: grand, status: 'UNPAID', notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();
  if (error) return { error: error.code === '23505' ? 'Invoice ID sudah digunakan.' : error.message };

  const { error: iErr } = await supabase.from('purchase_invoice_items').insert(
    lines.map((l, n) => ({ purchase_invoice_id: inv.id, product_id: idBy.get(l.sku) ?? null, sku: l.sku, description: l.description || null, qty: l.qty, uom: l.uom || null, unit_price: l.unit_price, total: l.qty * l.unit_price, sort_order: n }))
  );
  if (iErr) { await supabase.from('purchase_invoices').delete().eq('id', inv.id); return { error: iErr.message }; }
  refresh();
  return { success: true };
}

export async function deletePurchaseInvoice(id: string) {
  { const denied = await guard('/dashboard/purchase-invoice', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { count } = await supabase.from('purchase_payments').select('id', { count: 'exact', head: true }).eq('purchase_invoice_id', id);
  if ((count ?? 0) > 0) return { error: 'Invoice sudah memiliki pembayaran. Hapus pembayarannya terlebih dahulu.' };
  const { error } = await supabase.from('purchase_invoices').delete().eq('id', id);
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}

export async function recalcPurchaseInvoice(id: string) {
  { const denied = await guard('/dashboard/purchase-invoice', 'edit'); if (denied) return { error: denied }; }
  const supabase = createClient();
  return syncPurchaseInvoice(supabase, id);
}
