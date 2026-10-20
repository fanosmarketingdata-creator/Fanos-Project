import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary, buildSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function QuotationViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: q }, { data: items }] = await Promise.all([
    supabase.from('quotations').select('id, doc_no, quote_date, validity_date, status, discounts, charges, total_amount, clients(project_name, company), boq_projects(project_name)').eq('id', params.id).single(),
    supabase.from('quotation_items').select('sku, description, qty, uom, unit_price, subtotal').eq('quotation_id', params.id).order('sort_order'),
  ]);
  if (!q) notFound();
  const client = one<{ project_name: string }>(q.clients);
  const boq = one<{ project_name: string }>(q.boq_projects);
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);
  const { rows, total } = buildSummary(subtotal, q.discounts ?? [], q.charges ?? [], 'Total Penawaran');

  return (
    <DetailShell title="Detail Quotation" icon="fi fi-rr-file-invoice" backHref="/dashboard/quotations" printHref={`/dashboard/quotations/${q.id}/print`} editHref={q.status === 'DRAFT' ? `/dashboard/quotations/${q.id}` : undefined}>
      <DetailTop id={q.doc_no ?? 'Quotation'} title={client?.project_name ?? '-'} badge={q.status} amountLabel="Total Penawaran" amount={`Rp ${total.toLocaleString('id-ID')}`} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Quotation', value: dateShort(q.quote_date) },
        { icon: 'fi fi-rr-calendar-clock', label: 'Berlaku Sampai', value: dateShort(q.validity_date) },
        { icon: 'fi fi-rr-user', label: 'Client', value: client?.project_name ?? '-' },
        { icon: 'fa-solid fa-layer-group', label: 'BOQ Project', value: boq?.project_name ?? '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Daftar Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Deskripsi', align: 'l' }, { label: 'Qty' }, { label: 'UOM' }, { label: 'Harga Satuan', align: 'r' }, { label: 'Jumlah', align: 'r' }],
        rows: (items ?? []).map((it, i) => [i + 1, it.sku, it.description ?? '', num(it.qty), it.uom ?? '', `Rp ${num(it.unit_price)}`, `Rp ${num(it.subtotal)}`]),
      }} />
      <DetailSummary rows={rows} />
    </DetailShell>
  );
}
