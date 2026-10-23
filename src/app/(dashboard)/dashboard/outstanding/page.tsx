import { createClient } from '@/lib/supabase/server';
import OutstandingTable from './OutstandingTable';

export default async function OutstandingPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, doc_no, inv_date, status, grand_total, total_paid, paid_discount, credit_applied, remaining, clients(project_name)')
    .gt('remaining', 0)
    .order('inv_date', { ascending: true });

  const rows = (invoices ?? []).map((inv) => ({
    id: inv.id,
    doc_no: inv.doc_no as string | null,
    inv_date: inv.inv_date as string,
    status: inv.status as string,
    grand_total: Number(inv.grand_total),
    paid: Number(inv.total_paid) + Number(inv.paid_discount ?? 0) + Number(inv.credit_applied ?? 0),
    remaining: Number(inv.remaining),
    client_name: (inv.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-triangle-warning" />Outstanding</h1>
      <p className="mb-6 text-sm text-slate-500">Invoice yang belum lunas, terisi otomatis dari sistem dan diurutkan dari yang paling lama.</p>
      <OutstandingTable initialRows={rows} />
    </div>
  );
}
