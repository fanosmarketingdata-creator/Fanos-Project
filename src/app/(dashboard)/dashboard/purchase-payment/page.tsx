import { createClient } from '@/lib/supabase/server';
import PaymentTable from './PaymentTable';

export default async function PurchasePaymentPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('purchase_payments')
    .select('id, doc_no, pay_date, amount, discount, method, reference_no, purchase_invoices(doc_no, vendors(company))')
    .order('pay_date', { ascending: false })
    .order('created_at', { ascending: false });
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (data ?? []).map((p) => {
    const inv = one<{ doc_no: string | null; vendors: unknown }>(p.purchase_invoices);
    return {
      id: p.id as string, doc_no: (p.doc_no as string | null) ?? null, pay_date: p.pay_date as string, amount: Number(p.amount), discount: Number(p.discount ?? 0),
      method: (p.method as string | null) ?? null, reference_no: (p.reference_no as string | null) ?? null,
      invoice_no: inv?.doc_no ?? '-', vendor: one<{ company: string }>(inv?.vendors)?.company ?? '-',
    };
  });
  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-wallet" />Purchase Payment</h1>
      <p className="mb-6 text-sm text-slate-500">Pembayaran ke vendor terhadap Purchase Invoice.</p>
      <PaymentTable rows={rows} />
    </div>
  );
}
