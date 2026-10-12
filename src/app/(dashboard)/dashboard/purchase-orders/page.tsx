import { createClient } from '@/lib/supabase/server';
import POListTable from './POListTable';

export default async function PurchaseOrdersPage() {
  const supabase = createClient();
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('id, po_date, status, vendors(company), purchase_order_items(subtotal)')
    .order('po_date', { ascending: false });

  const rows = (pos ?? []).map((p) => ({
    id: p.id,
    po_date: p.po_date,
    status: p.status,
    vendor_name: (p.vendors as unknown as { company: string } | null)?.company ?? '-',
    total: ((p.purchase_order_items as unknown as { subtotal: number }[]) ?? []).reduce((s, it) => s + Number(it.subtotal), 0),
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Purchase Orders</h1>
      <p className="mb-6 text-sm text-slate-500">Pesanan pembelian ke vendor.</p>
      <POListTable initialRows={rows} />
    </div>
  );
}
