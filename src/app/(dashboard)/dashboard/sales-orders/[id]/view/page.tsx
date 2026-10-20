import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary, buildSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function SalesOrderViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: so }, { data: items }] = await Promise.all([
    supabase.from('sales_orders').select('id, doc_no, so_date, status, discounts, charges, global_notes, source_type, clients(project_name)').eq('id', params.id).single(),
    supabase.from('sales_order_items').select('sku, qty, qty_shipped, unit_price, total, notes, products(name)').eq('sales_order_id', params.id).order('sort_order'),
  ]);
  if (!so) notFound();
  const client = one<{ project_name: string }>(so.clients);
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.total), 0);
  const { rows, total } = buildSummary(subtotal, so.discounts ?? [], so.charges ?? [], 'Total Sales Order');
  const src = so.source_type === 'boq' ? 'BOQ Project' : so.source_type === 'quotation' ? 'Quotation' : 'Manual';

  return (
    <DetailShell title="Detail Sales Order" icon="fi fi-rr-shopping-cart" backHref="/dashboard/sales-orders" printHref={`/dashboard/sales-orders/${so.id}/print`} editHref={so.status === 'DRAFT' ? `/dashboard/sales-orders/${so.id}` : undefined}>
      <DetailTop id={so.doc_no ?? 'Sales Order'} title={client?.project_name ?? '-'} badge={so.status} amountLabel="Total" amount={`Rp ${total.toLocaleString('id-ID')}`} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal SO', value: dateShort(so.so_date) },
        { icon: 'fi fi-rr-user', label: 'Client', value: client?.project_name ?? '-' },
        { icon: 'fi fi-rr-link', label: 'Sumber', value: src },
        { icon: 'fi fi-rr-comment', label: 'Catatan Umum', value: so.global_notes || '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Daftar Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Qty' }, { label: 'Terkirim' }, { label: 'Harga Satuan', align: 'r' }, { label: 'Total', align: 'r' }, { label: 'Catatan', align: 'l' }],
        rows: (items ?? []).map((it, i) => [i + 1, it.sku, one<{ name: string }>(it.products)?.name ?? '-', num(it.qty), num(it.qty_shipped), `Rp ${num(it.unit_price)}`, `Rp ${num(it.total)}`, it.notes ?? '-']),
      }} />
      <DetailSummary rows={rows} />
    </DetailShell>
  );
}
