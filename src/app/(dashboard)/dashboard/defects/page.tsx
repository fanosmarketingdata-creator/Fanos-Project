import { createClient } from '@/lib/supabase/server';
import DefectsTable from './DefectsTable';

export default async function DefectsPage() {
  const supabase = createClient();
  const [{ data: defects }, { data: sos }, { data: products }] = await Promise.all([
    supabase
      .from('defects')
      .select('id, inspection_date, sales_order_id, sku, qty, description, status, sales_orders(clients(project_name))')
      .order('inspection_date', { ascending: false }),
    supabase.from('sales_orders').select('id, so_date, clients(project_name)').order('so_date', { ascending: false }),
    supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
  ]);

  const rows = (defects ?? []).map((d) => ({
    id: d.id,
    inspection_date: d.inspection_date,
    sales_order_id: d.sales_order_id,
    sku: d.sku,
    qty: Number(d.qty),
    description: d.description,
    status: d.status as 'OPEN' | 'RESOLVED',
    client_name: (d.sales_orders as unknown as { clients: { project_name: string } | null } | null)?.clients?.project_name ?? '-',
  }));

  const soOptions = (sos ?? []).map((s) => ({
    id: s.id,
    label: `${(s.clients as unknown as { project_name: string } | null)?.project_name ?? '-'} — ${new Date(s.so_date).toLocaleDateString('id-ID')}`,
  }));

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-clipboard-list-check" />Defect List</h1>
      <p className="mb-6 text-sm text-slate-500">Catatan barang cacat / bermasalah hasil pemeriksaan.</p>
      <DefectsTable initialRows={rows} soOptions={soOptions} products={products ?? []} />
    </div>
  );
}
