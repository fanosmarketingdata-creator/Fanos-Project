import { createClient } from '@/lib/supabase/server';
import PaymentForm from './PaymentForm';

export default async function NewPurchasePaymentPage({ searchParams }: { searchParams: { invoice?: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from('purchase_invoices')
    .select('id, doc_no, inv_date, grand_total, total_paid, paid_discount, remaining, vendors(company)')
    .gt('remaining', 0)
    .order('inv_date', { ascending: false });
  const invoices = (data ?? []).map((i) => ({
    id: i.id as string, doc_no: (i.doc_no as string | null) ?? null, vendor: (i.vendors as unknown as { company: string } | null)?.company ?? '-',
    grand_total: Number(i.grand_total), total_paid: Number(i.total_paid), paid_discount: Number(i.paid_discount ?? 0), remaining: Number(i.remaining),
  }));
  return <PaymentForm invoices={invoices} preset={searchParams.invoice ?? ''} />;
}
