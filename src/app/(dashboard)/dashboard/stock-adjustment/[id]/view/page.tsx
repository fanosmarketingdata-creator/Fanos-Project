import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

const TYPE: Record<string, string> = { IN: 'Stock In', OUT: 'Stock Out', OPNAME: 'Koreksi Selisih' };

export default async function AdjustmentViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: a }, { data: items }] = await Promise.all([
    supabase.from('stock_adjustments').select('id, doc_no, adj_date, adj_type, reason, notes, warehouses(name)').eq('id', params.id).single(),
    supabase.from('stock_adjustment_items').select('sku, qty, system_qty, diff, notes, products(name, uom)').eq('adjustment_id', params.id).order('sort_order'),
  ]);
  if (!a) notFound();
  const net = (items ?? []).reduce((s, i) => s + Number(i.diff), 0);
  const opname = a.adj_type === 'OPNAME';
  return (
    <DetailShell title="Detail Stock Adjustment" icon="fi fi-rr-edit" backHref="/dashboard/stock-adjustment">
      <DetailTop id={a.doc_no ?? 'Adjustment'} title={TYPE[a.adj_type] ?? a.adj_type} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal', value: dateShort(a.adj_date) },
        { icon: 'fi fi-rr-warehouse-alt', label: 'Gudang', value: one<{ name: string }>(a.warehouses)?.name ?? '-' },
        { icon: 'fi fi-rr-comment-alt', label: 'Alasan / Kategori', value: a.reason },
        { icon: 'fi fi-rr-document', label: 'Catatan', value: a.notes || '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, ...(opname ? [{ label: 'Stok Sistem' }] : []), { label: opname ? 'Hitung Fisik' : 'Qty' }, { label: 'Efek Stok' }, { label: 'Catatan', align: 'l' }],
        rows: (items ?? []).map((i, n) => [n + 1, i.sku, one<{ name: string }>(i.products)?.name ?? '-', ...(opname ? [num(i.system_qty)] : []), num(i.qty), (Number(i.diff) > 0 ? '+' : '') + num(i.diff), i.notes || '-']),
      }} />
      <DetailSummary rows={[{ label: 'Total Efek Stok', value: (net > 0 ? '+' : '') + num(net), kind: 'grand' }]} />
    </DetailShell>
  );
}
