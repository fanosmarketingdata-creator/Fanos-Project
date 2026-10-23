import type { createClient } from '@/lib/supabase/server';
import type { PayableInvoice } from './PaymentForm';

// Invoice yang masih punya sisa tagihan (+ invoice tertentu bila sedang edit payment-nya).
export async function loadPayableInvoices(supabase: ReturnType<typeof createClient>, includeId?: string): Promise<PayableInvoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('id, doc_no, inv_date, grand_total, total_paid, paid_discount, credit_applied, remaining, clients(project_name)')
    .or(includeId ? `remaining.gt.0,id.eq.${includeId}` : 'remaining.gt.0')
    .order('inv_date', { ascending: false });
  return (data ?? []).map((i) => ({
    id: i.id,
    doc_no: i.doc_no,
    inv_date: i.inv_date,
    client_name: (i.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    grand_total: Number(i.grand_total),
    total_paid: Number(i.total_paid),
    paid_discount: Number(i.paid_discount ?? 0),
    credit_applied: Number(i.credit_applied ?? 0),
    remaining: Number(i.remaining),
  }));
}
