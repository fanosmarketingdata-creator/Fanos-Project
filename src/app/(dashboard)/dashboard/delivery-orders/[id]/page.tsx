import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DeliveryOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: deliveryOrder } = await supabase
    .from('delivery_orders')
    .select('id, do_date, status, notes, sales_orders(id, clients(project_name, address, city))')
    .eq('id', params.id)
    .single();

  if (!deliveryOrder) notFound();

  const so = deliveryOrder.sales_orders as unknown as {
    id: string;
    clients: { project_name: string; address: string | null; city: string | null } | null;
  } | null;

  const { data: items } = await supabase
    .from('delivery_order_items')
    .select('sku, qty_shipped, notes, products(name)')
    .eq('delivery_order_id', params.id);

  return (
    <div>
      <Link href="/dashboard/delivery-orders" className="mb-3 inline-block text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Kembali ke daftar
      </Link>
      <Link
        href={`/dashboard/delivery-orders/${deliveryOrder.id}/print`}
        className="mb-3 ml-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        🖨️ Cetak Surat Jalan
      </Link>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Delivery Order</h1>
      <p className="mb-6 text-sm text-slate-500">
        {so?.clients?.project_name ?? '-'} ·{' '}
        {new Date(deliveryOrder.do_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-slate-400">Alamat Pengiriman</div>
            <div className="text-slate-700">
              {so?.clients?.address || '-'}
              {so?.clients?.city ? `, ${so.clients.city}` : ''}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400">Sales Order Terkait</div>
            {so?.id && (
              <Link href={`/dashboard/sales-orders`} className="text-brand-600 hover:underline">
                Lihat Sales Order
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Nama Produk</th>
              <th className="px-4 py-3 font-semibold">Qty Dikirim</th>
              <th className="px-4 py-3 font-semibold">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{it.sku}</td>
                <td className="px-4 py-3 text-slate-600">{(it.products as unknown as { name: string } | null)?.name ?? '-'}</td>
                <td className="px-4 py-3 text-slate-600">{Number(it.qty_shipped)}</td>
                <td className="px-4 py-3 text-slate-500">{it.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
