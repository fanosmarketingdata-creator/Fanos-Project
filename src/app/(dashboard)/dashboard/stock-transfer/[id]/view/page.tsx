import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

const ST: Record<string, string> = { DRAFT: 'Draft', SHIPPED: 'Shipped (In-Transit)', COMPLETED: 'Completed' };

export default async function TransferViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: t }, { data: items }] = await Promise.all([
    supabase.from('stock_transfers').select('id, doc_no, transfer_date, received_date, status, notes, from:warehouses!stock_transfers_from_warehouse_id_fkey(name), to:warehouses!stock_transfers_to_warehouse_id_fkey(name)').eq('id', params.id).single(),
    supabase.from('stock_transfer_items').select('sku, qty, products(name, uom)').eq('transfer_id', params.id).order('sort_order'),
  ]);
  if (!t) notFound();
  const total = (items ?? []).reduce((s, i) => s + Number(i.qty), 0);
  return (
    <DetailShell title="Detail Stock Transfer" icon="fi fi-rr-exchange" backHref="/dashboard/stock-transfer">
      <DetailTop id={t.doc_no ?? 'Transfer'} title={ST[t.status] ?? t.status} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-warehouse-alt', label: 'Gudang Asal', value: one<{ name: string }>(t.from)?.name ?? '-' },
        { icon: 'fi fi-rr-warehouse-alt', label: 'Gudang Tujuan', value: one<{ name: string }>(t.to)?.name ?? '-' },
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Kirim', value: dateShort(t.transfer_date) },
        { icon: 'fi fi-rr-calendar-check', label: 'Tanggal Terima', value: t.received_date ? dateShort(t.received_date) : '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Qty' }, { label: 'Satuan' }],
        rows: (items ?? []).map((i, n) => [n + 1, i.sku, one<{ name: string }>(i.products)?.name ?? '-', num(i.qty), one<{ uom: string }>(i.products)?.uom ?? '-']),
      }} />
      <DetailSummary rows={[{ label: 'Total Qty', value: num(total), kind: 'grand' }]} />
    </DetailShell>
  );
}
