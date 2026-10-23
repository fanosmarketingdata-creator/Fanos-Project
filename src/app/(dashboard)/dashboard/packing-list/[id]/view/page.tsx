import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function PackingViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: p }, { data: items }] = await Promise.all([
    supabase.from('packing_lists').select('id, doc_no, pl_date, status, ship_to, packed_by, notes, clients(project_name), sales_orders(doc_no)').eq('id', params.id).single(),
    supabase.from('packing_list_items').select('sku, qty, colli, weight, remarks, products(name, uom)').eq('packing_list_id', params.id).order('sort_order'),
  ]);
  if (!p) notFound();
  const client = one<{ project_name: string }>(p.clients);
  const so = one<{ doc_no: string | null }>(p.sales_orders);
  const tQty = (items ?? []).reduce((s, i) => s + Number(i.qty), 0);
  const tColli = (items ?? []).reduce((s, i) => s + Number(i.colli), 0);
  const tWeight = (items ?? []).reduce((s, i) => s + Number(i.weight), 0);
  return (
    <DetailShell title="Detail Packing List" icon="fi fi-rr-box-open" backHref="/dashboard/packing-list" printHref={`/dashboard/packing-list/${p.id}/print`}>
      <DetailTop id={p.doc_no ?? 'Packing List'} title={client?.project_name ?? '-'} badge={p.status} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal', value: dateShort(p.pl_date) },
        { icon: 'fi fi-rr-shopping-cart', label: 'Sales Order', value: so?.doc_no ?? '-' },
        { icon: 'fi fi-rr-marker', label: 'Alamat Pengiriman', value: p.ship_to || '-' },
        { icon: 'fi fi-rr-user', label: 'Dikemas Oleh', value: p.packed_by || '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Daftar Barang',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Qty' }, { label: 'Unit' }, { label: 'Koli' }, { label: 'Berat (Kg)' }, { label: 'Keterangan', align: 'l' }],
        rows: (items ?? []).map((i, n) => [n + 1, i.sku, one<{ name: string }>(i.products)?.name ?? '-', num(i.qty), one<{ uom: string }>(i.products)?.uom ?? '', num(i.colli), num(i.weight), i.remarks || '-']),
      }} />
      <DetailSummary rows={[{ label: 'Total Qty', value: num(tQty) }, { label: 'Total Koli', value: num(tColli) }, { label: 'Total Berat (Kg)', value: num(tWeight), kind: 'grand' }]} />
      {p.notes && <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Catatan: {p.notes}</p>}
    </DetailShell>
  );
}
