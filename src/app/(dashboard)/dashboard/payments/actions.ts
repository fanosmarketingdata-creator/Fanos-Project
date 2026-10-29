'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncInvoicePayments } from '@/lib/invoice-sync';

export type PaymentInput = {
  id?: string;
  invoice_id: string;
  doc_no?: string; // Payment ID (CR) manual; kosong = otomatis
  pay_date: string;
  amount: number;
  discount: number;
  method?: string;
  reference_no?: string;
  notes?: string;
};

function refresh() {
  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/payments');
  revalidatePath('/dashboard/outstanding');
}

export async function savePayment(input: PaymentInput) {
  { const denied = await guard('/dashboard/payments', 'save', input); if (denied) return { error: denied }; }
  if (!input.invoice_id) return { error: 'Mohon pilih Invoice terlebih dahulu.' };
  if (!input.pay_date) return { error: 'Kolom Tanggal Payment wajib diisi.' };
  const amount = Number(input.amount) || 0;
  const discount = Number(input.discount) || 0;
  if (amount < 0 || discount < 0) return { error: 'Jumlah tidak boleh negatif.' };
  if (amount + discount <= 0) return { error: 'Jumlah Payment atau Total Discount harus lebih dari 0.' };

  const supabase = createClient();
  const [{ data: inv }, { data: others }] = await Promise.all([
    supabase.from('invoices').select('grand_total, credit_applied').eq('id', input.invoice_id).single(),
    supabase.from('payments').select('id, amount, discount').eq('invoice_id', input.invoice_id),
  ]);
  if (!inv) return { error: 'Invoice tidak ditemukan' };
  const used = (others ?? []).filter((p) => p.id !== input.id).reduce((s, p) => s + Number(p.amount) + Number(p.discount ?? 0), 0);
  const owing = Number(inv.grand_total) - Number(inv.credit_applied ?? 0) - used;
  if (amount + discount > owing + 0.005) {
    return { error: `Jumlah payment + discount melebihi sisa tagihan (Rp ${Math.max(owing, 0).toLocaleString('id-ID')}).` };
  }

  const payload: Record<string, unknown> = {
    invoice_id: input.invoice_id,
    pay_date: input.pay_date,
    amount,
    discount,
    method: input.method || null,
    reference_no: input.reference_no || null,
    notes: input.notes || null,
  };
  const manual = input.doc_no?.trim();
  if (manual) payload.doc_no = manual;

  const { error } = input.id
    ? await supabase.from('payments').update(payload).eq('id', input.id)
    : await supabase.from('payments').insert(payload);
  if (error) return { error: error.code === '23505' ? `Payment ID "${manual}" sudah dipakai.` : error.message };

  const synced = await syncInvoicePayments(supabase, input.invoice_id);
  if (synced.error) return { error: synced.error };
  refresh();
  return { success: true };
}

export async function deletePayment(id: string) {
  { const denied = await guard('/dashboard/payments', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: p } = await supabase.from('payments').select('invoice_id').eq('id', id).single();
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) return { error: error.message };
  if (p?.invoice_id) {
    const synced = await syncInvoicePayments(supabase, p.invoice_id);
    if (synced.error) return { error: synced.error };
  }
  refresh();
  return { success: true };
}

// Detail penagihan satu invoice untuk halaman Outstanding.
export async function getCollectionDetail(invoiceId: string) {
  const supabase = createClient();
  const [{ data: inv }, { data: items }, { data: pays }] = await Promise.all([
    supabase.from('invoices').select('id, doc_no, inv_date, status, discounts, charges, grand_total, total_paid, paid_discount, credit_applied, remaining, clients(project_name, company)').eq('id', invoiceId).single(),
    supabase.from('invoice_items').select('sku, qty, unit_price, total, products(name)').eq('invoice_id', invoiceId),
    supabase.from('payments').select('id, doc_no, pay_date, amount, discount, method').eq('invoice_id', invoiceId).order('pay_date'),
  ]);
  if (!inv) return null;
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const c = one<{ project_name: string; company: string | null }>(inv.clients);
  return {
    id: inv.id as string,
    doc_no: (inv.doc_no as string | null) ?? null,
    inv_date: inv.inv_date as string,
    status: inv.status as string,
    client_name: c?.project_name ?? '-',
    grand_total: Number(inv.grand_total),
    total_paid: Number(inv.total_paid),
    paid_discount: Number(inv.paid_discount ?? 0),
    credit_applied: Number(inv.credit_applied ?? 0),
    remaining: Number(inv.remaining),
    discounts: (inv.discounts ?? []) as { label: string; percent: number; kind?: string }[],
    charges: (inv.charges ?? []) as { label: string; amount: number }[],
    items: (items ?? []).map((it) => ({ sku: it.sku as string, name: one<{ name: string }>(it.products)?.name ?? '', qty: Number(it.qty), unit_price: Number(it.unit_price), total: Number(it.total) })),
    payments: (pays ?? []).map((p) => ({ id: p.id as string, doc_no: (p.doc_no as string | null) ?? null, pay_date: p.pay_date as string, amount: Number(p.amount), discount: Number(p.discount ?? 0), method: (p.method as string | null) ?? null })),
  };
}
