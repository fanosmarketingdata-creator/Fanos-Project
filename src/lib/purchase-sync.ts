import type { SupabaseClient } from '@supabase/supabase-js';

// Hitung ulang total terbayar, sisa utang, dan status Purchase Invoice.
export async function syncPurchaseInvoice(supabase: SupabaseClient, invoiceId: string) {
  const [{ data: inv }, { data: pays }] = await Promise.all([
    supabase.from('purchase_invoices').select('grand_total').eq('id', invoiceId).single(),
    supabase.from('purchase_payments').select('amount, discount').eq('purchase_invoice_id', invoiceId),
  ]);
  if (!inv) return { error: 'Invoice tidak ditemukan' };
  const paid = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const disc = (pays ?? []).reduce((s, p) => s + Number(p.discount ?? 0), 0);
  const remaining = Math.max(0, Number(inv.grand_total) - paid - disc);
  const status = remaining <= 0.005 ? 'PAID' : paid + disc > 0 ? 'PARTIAL' : 'UNPAID';
  const { error } = await supabase.from('purchase_invoices').update({ total_paid: paid, paid_discount: disc, remaining, status }).eq('id', invoiceId);
  return error ? { error: error.message } : {};
}
