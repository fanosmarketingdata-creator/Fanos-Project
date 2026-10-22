import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuotationLetter from './QuotationLetter';
import { num, dateShort } from '@/lib/format';
import { buildTotals, one, type PrintClient } from '@/lib/print-helpers';

export default async function QuotationPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: q }, { data: items }] = await Promise.all([
    supabase
      .from('quotations')
      .select('id, doc_no, quote_date, validity_date, discounts, charges, total_amount, clients(project_name, company, contact_name, address, city, phone), boq_projects(project_name)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('quotation_items')
      .select('sku, description, qty, uom, unit_price, subtotal')
      .eq('quotation_id', params.id)
      .order('sort_order'),
  ]);
  if (!q) notFound();

  const rows = (items ?? []).map((it, i) => ({
    no: i + 1,
    sku: it.sku,
    name: it.description ?? '',
    qty: num(it.qty),
    uom: it.uom ?? '',
    price: num(it.unit_price),
    total: num(it.subtotal),
  }));
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);
  const { rows: totalRows } = buildTotals(subtotal, q.discounts, q.charges, 'Total Penawaran');

  const client = one<PrintClient>(q.clients);
  const boq = one<{ project_name: string }>(q.boq_projects);
  const addr = [client?.address, client?.city].filter(Boolean).join(', ');

  return (
    <QuotationLetter
      quoteId={q.id}
      docNo={q.doc_no ?? '-'}
      date={dateShort(q.quote_date)}
      validUntil={dateShort(q.validity_date)}
      company={client?.company || client?.project_name || '-'}
      address={addr}
      contactName={client?.contact_name ?? ''}
      project={boq?.project_name ?? client?.project_name ?? ''}
      rows={rows.map((r) => ({ no: r.no, sku: r.sku ?? '', name: r.name, qty: String(r.qty), uom: r.uom, price: String(r.price), total: String(r.total) }))}
      totals={totalRows}
    />
  );
}
