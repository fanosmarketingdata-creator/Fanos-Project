import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';
import { packageSummary } from '@/lib/packing';

export default async function PackingViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: p }, { data: items }] = await Promise.all([
    supabase.from('packing_lists').select('id, doc_no, pl_date, status, ship_to, packed_by, notes, clients(project_name), sales_orders(doc_no)').eq('id', params.id).single(),
    supabase.from('packing_list_items').select('sku, qty, colli, package_type, units_per_package, net_weight, gross_weight, length_cm, width_cm, height_cm, cbm, remarks, products(name, uom)').eq('packing_list_id', params.id).order('sort_order'),
  ]);
  if (!p) notFound();
  const client = one<{ project_name: string }>(p.clients);
  const so = one<{ doc_no: string | null }>(p.sales_orders);
  const tQty = (items ?? []).reduce((s, i) => s + Number(i.qty), 0);
  const tNw = (items ?? []).reduce((s, i) => s + Number(i.net_weight), 0);
  const tGw = (items ?? []).reduce((s, i) => s + Number(i.gross_weight), 0);
  const tCbm = (items ?? []).reduce((s, i) => s + Number(i.cbm), 0);
  const pk = packageSummary((items ?? []).map((i) => ({ package_type: i.package_type, packages: Number(i.colli) })));
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
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Jenis Kemasan' }, { label: 'Jumlah Kemasan' }, { label: 'Unit / Kemasan' }, { label: 'Total Qty' }, { label: 'NW (Kg)' }, { label: 'GW (Kg)' }, { label: 'Dimensi (P x L x T cm) / CBM' }],
        rows: (items ?? []).map((i, n) => [n + 1, i.sku, one<{ name: string }>(i.products)?.name ?? '-', i.package_type, num(i.colli), num(i.units_per_package), `${num(i.qty)} ${one<{ uom: string }>(i.products)?.uom ?? ''}`, num(i.net_weight), num(i.gross_weight), `${num(i.length_cm)} x ${num(i.width_cm)} x ${num(i.height_cm)} / ${Number(i.cbm).toFixed(3)}`]),
      }} />
      <DetailSummary rows={[
        { label: 'Total Jumlah Kemasan', value: pk },
        { label: 'Total Qty', value: num(tQty) },
        { label: 'Total Berat Bersih (NW)', value: `${num(tNw)} Kg` },
        { label: 'Total Berat Kotor (GW)', value: `${num(tGw)} Kg` },
        { label: 'Total Volume (CBM)', value: `${tCbm.toFixed(3)} CBM`, kind: 'grand' },
      ]} />
      {p.notes && <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Catatan: {p.notes}</p>}
    </DetailShell>
  );
}
