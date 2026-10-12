import { createClient } from '@/lib/supabase/server';
import InvoiceListTable from './InvoiceListTable';

export default async function InvoicesPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, inv_date, status, grand_total, total_paid, remaining, clients(project_name)')
    .order('inv_date', { ascending: false });

  const rows = (invoices ?? []).map((inv) => ({
    id: inv.id,
    inv_date: inv.inv_date,
    status: inv.status,
    grand_total: Number(inv.grand_total),
    total_paid: Number(inv.total_paid),
    remaining: Number(inv.remaining),
    client_name: (inv.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Invoices</h1>
      <p className="mb-6 text-sm text-slate-500">Tagihan ke client, dibuat dari Sales Order.</p>
      <InvoiceListTable initialRows={rows} />
    </div>
  );
}
