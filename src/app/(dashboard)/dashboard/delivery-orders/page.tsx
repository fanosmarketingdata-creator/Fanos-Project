import ClickRow from '@/components/registry/ClickRow';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DeliveryOrdersPage() {
  const supabase = createClient();
  const { data: dos } = await supabase
    .from('delivery_orders')
    .select('id, doc_no, do_date, status, client_id, clients(project_name), sales_orders(id, clients(project_name)), delivery_order_items(count)')
    .order('do_date', { ascending: false });

  const rows = (dos ?? []).map((d) => {
    const so = d.sales_orders as unknown as { id: string; clients: { project_name: string } | null } | null;
    return {
      id: d.id,
      doc_no: d.doc_no,
      do_date: d.do_date,
      status: d.status,
      so_id: so?.id ?? '',
      client_name: so?.clients?.project_name ?? (d.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
      item_count: (d.delivery_order_items as unknown as { count: number }[])?.[0]?.count ?? 0,
    };
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}><i className="fi fi-rr-shipping-fast" />Delivery Orders</h1>
          <p className="text-sm text-slate-500">Surat Jalan dapat dibuat langsung atau dari Sales Order, tanpa harus menunggu Sales Order.</p>
        </div>
        <Link href="/dashboard/delivery-orders/new" className="btn btn-primary">
          <i className="fi fi-rr-plus" /> New Delivery Order
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Tanggal Kirim</th>
              <th className="px-4 py-3 font-semibold">Jumlah Item</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum terdapat data pengiriman
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <ClickRow key={r.id} href={`/dashboard/delivery-orders/${r.id}`} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.client_name}
                  {r.doc_no && <div className="font-mono text-[10px] font-normal text-slate-400">{r.doc_no}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.do_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.item_count}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/delivery-orders/${r.id}`}
                    className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    Lihat Detail
                  </Link>
                  <Link
                    href={`/dashboard/delivery-orders/${r.id}/print`}
                    className="ml-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                  >
                    Cetak
                  </Link>
                </td>
              </ClickRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
