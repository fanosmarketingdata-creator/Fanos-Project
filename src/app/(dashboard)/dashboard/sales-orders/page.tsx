import { createClient } from '@/lib/supabase/server';
import SalesOrderListTable from './SalesOrderListTable';

export default async function SalesOrdersPage() {
  const supabase = createClient();
  const { data: sos } = await supabase
    .from('sales_orders')
    .select('id, so_date, status, total_amount, clients(project_name)')
    .order('so_date', { ascending: false });

  const rows = (sos ?? []).map((s) => ({
    id: s.id,
    so_date: s.so_date,
    status: s.status,
    total_amount: Number(s.total_amount),
    client_name: (s.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Sales Orders</h1>
      <p className="mb-6 text-sm text-slate-500">Pesanan terkonfirmasi dari client.</p>
      <SalesOrderListTable initialRows={rows} />
    </div>
  );
}
