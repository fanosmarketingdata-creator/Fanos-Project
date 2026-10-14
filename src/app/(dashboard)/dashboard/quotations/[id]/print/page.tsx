import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { num, dateShort } from '@/lib/format';
import { buildTotals, clientLines, one, type PrintClient } from '@/lib/print-helpers';

export default async function QuotationPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: q }, { data: items }] = await Promise.all([
    supabase
      .from('quotations')
      .select('id, doc_no, quote_date, validity_date, discounts, charges, total_amount, clients(project_name, company, contact_name, address, city, phone)')
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

  return (
    <div>
      <PrintToolbar backHref="/dashboard/quotations" docNo={q.doc_no} />
      <PrintDocument
        title="QUOTATION"
        meta={[
          { label: 'Tgl Quotation', value: dateShort(q.quote_date) },
          { label: 'No Quotation', value: q.doc_no ?? '-' },
          { label: 'Berlaku s/d', value: dateShort(q.validity_date) },
        ]}
        parties={[{ label: 'Kepada Yth,', lines: clientLines(one<PrintClient>(q.clients)) }]}
        columns={[
          { key: 'no', label: 'No.', width: '5%', align: 'center' },
          { key: 'sku', label: 'Item', width: '16%', align: 'left' },
          { key: 'name', label: 'Deskripsi', align: 'left' },
          { key: 'qty', label: 'Qty', width: '7%', align: 'center' },
          { key: 'uom', label: 'Unit', width: '7%', align: 'center' },
          { key: 'price', label: 'Harga Satuan', width: '15%', align: 'right' },
          { key: 'total', label: 'Jumlah', width: '15%', align: 'right' },
        ]}
        rows={rows}
        totals={totalRows}
        signatures={['Hormat Kami', 'Disetujui Client']}
      />
    </div>
  );
}
