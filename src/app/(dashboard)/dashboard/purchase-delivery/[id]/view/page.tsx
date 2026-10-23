import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function PurchaseDeliveryViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: g }, { data: items }] = await Promise.all([
    supabase.from('purchase_deliveries').select('id, doc_no, gr_date, vendor_do_no, notes, purchase_orders(doc_no), vendors(company), warehouses(name)').eq('id', params.id).single(),
    supabase.from('purchase_delivery_items').select('sku, qty_received, notes, products(name, uom)').eq('purchase_delivery_id', params.id).order('sort_order'),
  ]);
  if (!g) notFound();
  const total = (items ?? []).reduce((s, i) => s + Number(i.qty_received), 0);
  return (
    <DetailShell title="Detail Purchase Delivery" icon="fa-solid fa-dolly" backHref="/dashboard/purchase-delivery">
      <DetailTop id={g.doc_no ?? 'Purchase Delivery'} title="Penerimaan Barang" />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Terima', value: dateShort(g.gr_date) },
        { icon: 'fi fi-rr-file-invoice', label: 'Purchase Order', value: one<{ doc_no: string }>(g.purchase_orders)?.doc_no ?? '-' },
        { icon: 'fa-solid fa-truck', label: 'Vendor', value: one<{ company: string }>(g.vendors)?.company ?? '-' },
        { icon: 'fi fi-rr-warehouse-alt', label: 'Gudang', value: one<{ name: string }>(g.warehouses)?.name ?? '-' },
        { icon: 'fi fi-rr-document', label: 'SJ Vendor', value: g.vendor_do_no || '-' },
        { icon: 'fi fi-rr-comment-alt', label: 'Catatan', value: g.notes || '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Item Diterima',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Qty' }, { label: 'Satuan' }],
        rows: (items ?? []).map((i, n) => [n + 1, i.sku, one<{ name: string }>(i.products)?.name ?? '-', num(i.qty_received), one<{ uom: string }>(i.products)?.uom ?? '-']),
      }} />
      <DetailSummary rows={[{ label: 'Total Qty Diterima', value: num(total), kind: 'grand' }]} />
    </DetailShell>
  );
}
