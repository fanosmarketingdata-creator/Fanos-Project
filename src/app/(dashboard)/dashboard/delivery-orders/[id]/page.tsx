import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function DeliveryOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: d } = await supabase
    .from('delivery_orders')
    .select('id, doc_no, do_date, status, notes, client_id, clients(project_name, address, city), sales_orders(id, doc_no, clients(project_name, address, city))')
    .eq('id', params.id)
    .single();
  if (!d) notFound();

  const so = one<{ id: string; doc_no: string | null; clients: unknown }>(d.sales_orders);
  const client = one<{ project_name: string; address: string | null; city: string | null }>(so?.clients) ?? one<{ project_name: string; address: string | null; city: string | null }>(d.clients);
  const { data: items } = await supabase
    .from('delivery_order_items')
    .select('sku, qty_shipped, notes, products(name)')
    .eq('delivery_order_id', params.id);

  return (
    <DetailShell title="Detail Delivery Order" icon="fi fi-rr-shipping-fast" backHref="/dashboard/delivery-orders" printHref={`/dashboard/delivery-orders/${d.id}/print`}>
      <DetailTop id={d.doc_no ?? 'Delivery Order'} title={client?.project_name ?? '-'} badge={d.status} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Pengiriman', value: dateShort(d.do_date) },
        { icon: 'fi fi-rr-marker', label: 'Alamat Pengiriman', value: [client?.address, client?.city].filter(Boolean).join(', ') || '-' },
        { icon: 'fi fi-rr-shopping-cart', label: 'Sales Order', value: so?.doc_no ?? '-' },
        { icon: 'fi fi-rr-comment', label: 'Catatan', value: d.notes || '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Daftar Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Qty Dikirim' }, { label: 'Catatan', align: 'l' }],
        rows: (items ?? []).map((it, i) => [i + 1, it.sku, one<{ name: string }>(it.products)?.name ?? '-', num(it.qty_shipped), it.notes || '-']),
      }} />
    </DetailShell>
  );
}
