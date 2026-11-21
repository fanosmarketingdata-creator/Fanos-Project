import { createClient } from '@/lib/supabase/server';
import SalesOrderListTable from './SalesOrderListTable';
import { orThrow } from '@/lib/query';

export default async function SalesOrdersPage() {
  const supabase = createClient();
  const { data: sos } = orThrow(await supabase
    .from('sales_orders')
    .select('id, doc_no, so_date, status, total_amount, project_name, clients(project_name), boq_projects(project_name)')
    .order('so_date', { ascending: false }));

  const rows = (sos ?? []).map((s) => ({
    id: s.id,
    doc_no: s.doc_no,
    so_date: s.so_date,
    status: s.status,
    total_amount: Number(s.total_amount),
    client_name: (s.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    // SO lama belum tentu menyimpan project_name sendiri: cadangkan ke BOQ Project-nya.
    project_name: ((s as { project_name?: string | null }).project_name
      || (Array.isArray(s.boq_projects) ? (s.boq_projects as { project_name: string }[])[0]?.project_name : (s.boq_projects as unknown as { project_name: string } | null)?.project_name)
      || '') as string,
  }));

  return (
    <div>
      <SalesOrderListTable initialRows={rows} />
    </div>
  );
}
