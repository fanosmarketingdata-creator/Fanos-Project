import { richToPlain } from '@/lib/rich-text';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary, buildSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function SalesOrderViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: so }, { data: items }] = await Promise.all([
    supabase.from('sales_orders').select('*, clients(project_name), quotations(id, doc_no), boq_projects(id, doc_no)').eq('id', params.id).single(),
    supabase.from('sales_order_items').select('sku, qty, qty_shipped, unit_price, total, notes, products(name)').eq('sales_order_id', params.id).order('sort_order'),
  ]);
  if (!so) notFound();
  const client = one<{ project_name: string }>(so.clients);
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.total), 0);
  const { rows, total } = buildSummary(subtotal, so.discounts ?? [], so.charges ?? [], 'Total Sales Order');
  const src = so.source_type === 'boq' ? 'BOQ Project' : so.source_type === 'quotation' ? 'Quotation' : 'Manual';
  // Sumber dokumen yang bisa diklik supaya pengguna dapat menelusuri (tracking) asal SO.
  // Quotation sudah memuat BOQ-nya, jadi BOQ hanya ditampilkan bila SO dibuat langsung dari BOQ (tanpa quotation).
  const quote = one<{ id: string; doc_no: string | null }>(so.quotations);
  const boq = one<{ id: string; doc_no: string | null }>(so.boq_projects);
  const linkStyle = { color: '#2563eb', textDecoration: 'none' } as const;
  const sourceValue = (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span>{src}</span>
      {quote && (
        <Link href={`/dashboard/quotations/${quote.id}/view`} style={linkStyle}>
          {quote.doc_no ?? 'Quotation'}
        </Link>
      )}
      {!quote && boq && (
        <Link href={`/dashboard/boq-project/${boq.id}/view`} style={linkStyle}>
          {boq.doc_no ?? 'BOQ Project'}
        </Link>
      )}
    </span>
  );

  return (
    <DetailShell title="Detail Sales Order" icon="fi fi-rr-shopping-cart" backHref="/dashboard/sales-orders" printHref={`/dashboard/sales-orders/${so.id}/print`} editHref={so.status === 'DRAFT' ? `/dashboard/sales-orders/${so.id}` : undefined}>
      <DetailTop id={so.doc_no ?? 'Sales Order'} title={client?.project_name ?? '-'} badge={so.status} amountLabel="Total" amount={`Rp ${total.toLocaleString('id-ID')}`} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal SO', value: dateShort(so.so_date) },
        { icon: 'fi fi-rr-briefcase', label: 'Project', value: (so as { project_name?: string | null }).project_name || '-' },
        { icon: 'fi fi-rr-user', label: 'Client', value: client?.project_name ?? '-' },
        { icon: 'fi fi-rr-link', label: 'Sumber', value: sourceValue },
        { icon: 'fi fi-rr-comment', label: 'Catatan Umum', value: richToPlain(so.global_notes) || '-' },
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
