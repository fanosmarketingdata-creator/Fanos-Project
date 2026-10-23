import { createClient } from '@/lib/supabase/server';
import PackingListTable from './PackingListTable';

export default async function PackingListPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('packing_lists')
    .select('id, doc_no, pl_date, status, clients(project_name), sales_orders(doc_no), packing_list_items(qty, colli, weight)')
    .order('pl_date', { ascending: false });
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (data ?? []).map((p) => {
    const items = (p.packing_list_items as unknown as { qty: number; colli: number; weight: number }[]) ?? [];
    return {
      id: p.id as string,
      doc_no: (p.doc_no as string | null) ?? null,
      pl_date: p.pl_date as string,
      status: p.status as string,
      client_name: one<{ project_name: string }>(p.clients)?.project_name ?? '-',
      so_no: one<{ doc_no: string | null }>(p.sales_orders)?.doc_no ?? '-',
      qty: items.reduce((s, i) => s + Number(i.qty), 0),
      colli: items.reduce((s, i) => s + Number(i.colli), 0),
      weight: items.reduce((s, i) => s + Number(i.weight), 0),
    };
  });
  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-box-open" />Packing List</h1>
      <p className="mb-6 text-sm text-slate-500">Daftar pengemasan barang berdasarkan Sales Order yang sudah VERIFIED, sebelum dibuat Delivery Order.</p>
      <PackingListTable rows={rows} />
    </div>
  );
}
