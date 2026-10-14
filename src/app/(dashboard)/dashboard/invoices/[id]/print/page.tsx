import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { COMPANY } from '@/lib/company';
import { rupiah, num, dateShort } from '@/lib/format';
import { buildTotals, clientLines, one, type PrintClient } from '@/lib/print-helpers';

export default async function InvoicePrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: inv }, { data: items }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, doc_no, inv_date, discounts, charges, grand_total, total_paid, remaining, clients(project_name, company, contact_name, address, city, phone), sales_orders(doc_no)')
      .eq('id', params.id)
      .single(),
    supabase.from('invoice_items').select('sku, qty, unit_price, total, products(name, uom)').eq('invoice_id', params.id),
  ]);
  if (!inv) notFound();

  const client = one<PrintClient>(inv.clients);
  const so = one<{ doc_no: string | null }>(inv.sales_orders);
  const rows = (items ?? []).map((it, i) => {
    const p = one<{ name: string; uom: string }>(it.products);
    return { no: i + 1, sku: it.sku, name: p?.name ?? '', qty: num(it.qty), uom: p?.uom ?? '', price: num(it.unit_price), total: num(it.total) };
  });
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.total), 0);
  const { rows: totalRows } = buildTotals(subtotal, inv.discounts, inv.charges, 'Total Invoice');
  // angka akhir mengikuti nilai tersimpan di database
  totalRows[totalRows.length - 1].value = rupiah(inv.grand_total);
  if (Number(inv.total_paid) > 0) {
    totalRows.push({ label: 'Terbayar:', value: rupiah(inv.total_paid) }, { label: 'Sisa Tagihan:', value: rupiah(inv.remaining), bold: true });
  }

  return (
    <div>
      <PrintToolbar backHref={`/dashboard/invoices/${inv.id}`} docNo={inv.doc_no} />
      <PrintDocument
        title="SALES INVOICE"
        meta={[
          { label: 'Tgl Invoice', value: dateShort(inv.inv_date) },
          { label: 'No Invoice', value: inv.doc_no ?? '-' },
          { label: 'No SO', value: so?.doc_no ?? '-' },
        ]}
        parties={[{ label: 'Kepada Yth,', lines: clientLines(client) }]}
        columns={[
          { key: 'no', label: 'No.', width: '5%', align: 'center' },
          { key: 'sku', label: 'Item', width: '16%', align: 'left' },
          { key: 'name', label: 'Nama Barang', align: 'left' },
          { key: 'qty', label: 'Qty', width: '7%', align: 'center' },
          { key: 'uom', label: 'Unit', width: '7%', align: 'center' },
          { key: 'price', label: 'Harga Satuan', width: '15%', align: 'right' },
          { key: 'total', label: 'Jumlah', width: '15%', align: 'right' },
        ]}
        rows={rows}
        totals={totalRows}
        notes={COMPANY.paymentInfo}
        signatures={['Disiapkan Oleh', 'Disetujui Oleh', 'Dikirim Oleh', 'Diterima Oleh']}
      />
    </div>
  );
}
