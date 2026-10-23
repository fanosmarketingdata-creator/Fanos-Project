import type { SupabaseClient } from '@supabase/supabase-js';

// Hitung ulang total terbayar, diskon pembayaran, kredit (credit note), sisa dan status invoice.
// owing = grand_total - payment - discount - credit note yang dipakai.
export async function syncInvoicePayments(supabase: SupabaseClient, invoiceId: string) {
  const [{ data: inv }, { data: pays }, { data: apps }] = await Promise.all([
    supabase.from('invoices').select('grand_total').eq('id', invoiceId).single(),
    supabase.from('payments').select('amount, discount').eq('invoice_id', invoiceId),
    supabase.from('credit_note_applications').select('amount').eq('invoice_id', invoiceId).eq('kind', 'APPLY'),
  ]);
  if (!inv) return { error: 'Invoice tidak ditemukan' };
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const disc = (pays ?? []).reduce((s, p) => s + Number(p.discount ?? 0), 0);
  const credit = (apps ?? []).reduce((s, a) => s + Number(a.amount), 0);
  const remaining = Math.max(0, Number(inv.grand_total) - paid - disc - credit);
  const status = remaining <= 0.005 ? 'PAID' : paid + disc + credit > 0 ? 'PARTIAL' : 'UNPAID';
  const { error } = await supabase
    .from('invoices')
    .update({ total_paid: paid, paid_discount: disc, credit_applied: credit, remaining, status })
    .eq('id', invoiceId);
  return error ? { error: error.message } : {};
}
