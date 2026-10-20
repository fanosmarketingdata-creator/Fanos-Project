import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function POViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: po }, { data: items }] = await Promise.all([
    supabase.from('purchase_orders').select('id, doc_no, po_date, status, notes, vendors(company)').eq('id', params.id).single(),
    supabase.from('purchase_order_items').select('sku, description, qty, uom, unit_price, subtotal').eq('purchase_order_id', params.id),
  ]);
  if (!po) notFound();
  const vendor = one<{ company: string }>(po.vendors);
  const total = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);

  return (
    <DetailShell title="Detail Purchase Order" icon="fi fi-rr-document" backHref="/dashboard/purchase-orders" printHref={`/dashboard/purchase-orders/${po.id}/print`} editHref={po.status === 'DRAFT' ? `/dashboard/purchase-orders/${po.id}` : undefined}>
      <DetailTop id={po.doc_no ?? 'Purchase Order'} title={vendor?.company ?? '-'} badge={po.status} amountLabel="Total" amount={`Rp ${total.toLocaleString('id-ID')}`} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal PO', value: dateShort(po.po_date) },
        { icon: 'fi fi-rr-truck-side', label: 'Vendor', value: vendor?.company ?? '-' },
        { icon: 'fi fi-rr-comment', label: 'Catatan', value: po.notes || '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Daftar Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Deskripsi', align: 'l' }, { label: 'Qty' }, { label: 'UOM' }, { label: 'Harga Beli', align: 'r' }, { label: 'Subtotal', align: 'r' }],
        rows: (items ?? []).map((it, i) => [i + 1, it.sku, it.description ?? '', num(it.qty), it.uom ?? '', `Rp ${num(it.unit_price)}`, `Rp ${num(it.subtotal)}`]),
      }} />
      <DetailSummary rows={[{ label: 'Total Purchase Order', value: `Rp ${total.toLocaleString('id-ID')}`, kind: 'grand' }]} />
    </DetailShell>
  );
}
