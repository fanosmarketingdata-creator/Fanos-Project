'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncInvoicePayments } from '@/lib/invoice-sync';

function refresh() {
  ['credit-notes', 'invoices', 'outstanding', 'payments', 'returns/invoice'].forEach((p) => revalidatePath('/dashboard/' + p));
}

async function recalcCN(supabase: ReturnType<typeof createClient>, cnId: string) {
  const [{ data: cn }, { data: apps }] = await Promise.all([
    supabase.from('credit_notes').select('amount').eq('id', cnId).single(),
    supabase.from('credit_note_applications').select('kind, amount').eq('credit_note_id', cnId),
  ]);
  const applied = (apps ?? []).filter((a) => a.kind === 'APPLY').reduce((s, a) => s + Number(a.amount), 0);
  const refunded = (apps ?? []).filter((a) => a.kind === 'REFUND').reduce((s, a) => s + Number(a.amount), 0);
  const amount = Number(cn?.amount ?? 0);
  const status = applied + refunded >= amount - 0.005 ? 'CLOSED' : applied + refunded > 0 ? 'PARTIAL' : 'ISSUED';
  await supabase.from('credit_notes').update({ applied_amount: applied, refunded_amount: refunded, status }).eq('id', cnId);
  return amount - applied - refunded;
}

// Invoice milik client yang sama yang masih punya sisa tagihan.
export async function getApplicableInvoices(cnId: string) {
  const supabase = createClient();
  const { data: cn } = await supabase.from('credit_notes').select('client_id').eq('id', cnId).single();
  if (!cn) return [];
  const { data } = await supabase.from('invoices').select('id, doc_no, inv_date, remaining').eq('client_id', cn.client_id).gt('remaining', 0).order('inv_date');
  return (data ?? []).map((i) => ({ id: i.id as string, doc_no: (i.doc_no as string | null) ?? null, inv_date: i.inv_date as string, remaining: Number(i.remaining) }));
}

export async function applyCreditNote(cnId: string, invoiceId: string, amount: number, date: string) {
  { const denied = await guard('/dashboard/credit-notes', 'edit'); if (denied) return { error: denied }; }
  if (!invoiceId) return { error: 'Mohon pilih Invoice terlebih dahulu.' };
  if (!(amount > 0)) return { error: 'Jumlah harus lebih dari 0.' };
  const supabase = createClient();
  const [{ data: cn }, { data: inv }] = await Promise.all([
    supabase.from('credit_notes').select('amount, applied_amount, refunded_amount, client_id').eq('id', cnId).single(),
    supabase.from('invoices').select('remaining, client_id').eq('id', invoiceId).single(),
  ]);
  if (!cn || !inv) return { error: 'Data tidak ditemukan' };
  if (cn.client_id !== inv.client_id) return { error: 'Invoice harus milik client yang sama dengan Credit Note.' };
  const balance = Number(cn.amount) - Number(cn.applied_amount) - Number(cn.refunded_amount);
  if (amount > balance + 0.005) return { error: `Jumlah melebihi saldo Credit Note (Rp ${Math.round(balance).toLocaleString('id-ID')}).` };
  if (amount > Number(inv.remaining) + 0.005) return { error: `Jumlah melebihi sisa tagihan invoice (Rp ${Math.round(Number(inv.remaining)).toLocaleString('id-ID')}).` };

  const { error } = await supabase.from('credit_note_applications').insert({ credit_note_id: cnId, invoice_id: invoiceId, kind: 'APPLY', amount, app_date: date || new Date().toISOString().split('T')[0] });
  if (error) return { error: error.message };
  await recalcCN(supabase, cnId);
  const s = await syncInvoicePayments(supabase, invoiceId);
  if (s.error) return { error: s.error };
  refresh();
  return { success: true };
}

export async function refundCreditNote(cnId: string, amount: number, date: string, method: string, reference: string) {
  { const denied = await guard('/dashboard/credit-notes', 'edit'); if (denied) return { error: denied }; }
  if (!(amount > 0)) return { error: 'Jumlah harus lebih dari 0.' };
  const supabase = createClient();
  const { data: cn } = await supabase.from('credit_notes').select('amount, applied_amount, refunded_amount').eq('id', cnId).single();
  if (!cn) return { error: 'Credit Note tidak ditemukan' };
  const balance = Number(cn.amount) - Number(cn.applied_amount) - Number(cn.refunded_amount);
  if (amount > balance + 0.005) return { error: `Jumlah melebihi saldo Credit Note (Rp ${Math.round(balance).toLocaleString('id-ID')}).` };
  const { error } = await supabase.from('credit_note_applications').insert({ credit_note_id: cnId, kind: 'REFUND', amount, app_date: date || new Date().toISOString().split('T')[0], method: method || null, reference_no: reference || null });
  if (error) return { error: error.message };
  await recalcCN(supabase, cnId);
  refresh();
  return { success: true };
}

export async function getCreditNoteDetail(cnId: string) {
  const supabase = createClient();
  const [{ data: cn }, { data: apps }] = await Promise.all([
    supabase.from('credit_notes').select('id, doc_no, cn_date, amount, applied_amount, refunded_amount, status, clients(project_name), invoices(doc_no), sales_returns!sales_return_id(doc_no, reason)').eq('id', cnId).single(),
    supabase.from('credit_note_applications').select('id, kind, amount, app_date, method, reference_no, invoices(doc_no)').eq('credit_note_id', cnId).order('app_date'),
  ]);
  if (!cn) return null;
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  return {
    id: cn.id as string,
    doc_no: (cn.doc_no as string | null) ?? null,
    cn_date: cn.cn_date as string,
    amount: Number(cn.amount),
    applied: Number(cn.applied_amount),
    refunded: Number(cn.refunded_amount),
    status: cn.status as string,
    client_name: one<{ project_name: string }>(cn.clients)?.project_name ?? '-',
    invoice_no: one<{ doc_no: string | null }>(cn.invoices)?.doc_no ?? '-',
    return_no: one<{ doc_no: string | null }>(cn.sales_returns)?.doc_no ?? '-',
    reason: one<{ reason: string | null }>(cn.sales_returns)?.reason ?? null,
    apps: (apps ?? []).map((a) => ({ id: a.id as string, kind: a.kind as string, amount: Number(a.amount), date: a.app_date as string, method: (a.method as string | null) ?? null, reference: (a.reference_no as string | null) ?? null, invoice_no: one<{ doc_no: string | null }>(a.invoices)?.doc_no ?? '-' })),
  };
}
