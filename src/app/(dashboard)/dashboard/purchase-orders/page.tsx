import { createClient } from '@/lib/supabase/server';
import POListTable from './POListTable';
import { orThrow } from '@/lib/query';

export default async function PurchaseOrdersPage() {
  const supabase = createClient();
  const { data: pos } = orThrow(await supabase
    .from('purchase_orders')
    .select('id, doc_no, po_date, status, vendors(company), purchase_order_items(subtotal)')
    .order('po_date', { ascending: false }));

  const rows = (pos ?? []).map((p) => ({
    id: p.id,
    doc_no: p.doc_no,
    po_date: p.po_date,
    status: p.status,
    vendor_name: (p.vendors as unknown as { company: string } | null)?.company ?? '-',
    total: ((p.purchase_order_items as unknown as { subtotal: number }[]) ?? []).reduce((s, it) => s + Number(it.subtotal), 0),
  }));

  return (
    <div>
      <POListTable initialRows={rows} />
    </div>
  );
}
