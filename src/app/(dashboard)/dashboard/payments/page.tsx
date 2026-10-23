import { createClient } from '@/lib/supabase/server';
import PaymentListTable from './PaymentListTable';

export default async function PaymentsPage() {
  const supabase = createClient();
  const { data: payments } = await supabase
    .from('payments')
    .select('id, doc_no, pay_date, amount, discount, method, reference_no, invoices(doc_no, clients(project_name))')
    .order('pay_date', { ascending: false });

  const rows = (payments ?? []).map((p) => {
    const inv = p.invoices as unknown as { doc_no: string | null; clients: { project_name: string } | null } | null;
    return {
      id: p.id,
      doc_no: p.doc_no as string | null,
      pay_date: p.pay_date as string,
      amount: Number(p.amount),
      discount: Number(p.discount ?? 0),
      method: p.method as string | null,
      reference_no: p.reference_no as string | null,
      invoice_no: inv?.doc_no ?? '-',
      client_name: inv?.clients?.project_name ?? '-',
    };
  });

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-money-bill-wave" />Payment</h1>
      <p className="mb-6 text-sm text-slate-500">Pembayaran dari client terhadap invoice (Collection).</p>
      <PaymentListTable initialRows={rows} />
    </div>
  );
}
