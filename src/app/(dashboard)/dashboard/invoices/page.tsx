import { createClient } from '@/lib/supabase/server';
import InvoiceListTable from './InvoiceListTable';

export default async function InvoicesPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, doc_no, inv_date, status, grand_total, total_paid, remaining, clients(project_name)')
    .order('inv_date', { ascending: false });

  const rows = (invoices ?? []).map((inv) => ({
    id: inv.id,
    doc_no: inv.doc_no,
    inv_date: inv.inv_date,
    status: inv.status,
    grand_total: Number(inv.grand_total),
    total_paid: Number(inv.total_paid),
    remaining: Number(inv.remaining),
    client_name: (inv.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));

  return (
    <div>
      <InvoiceListTable initialRows={rows} />
    </div>
  );
}
