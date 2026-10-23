import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { rupiah, num, dateShort } from '@/lib/format';
import { buildTotals, clientLines, one, type PrintClient } from '@/lib/print-helpers';

export default async function CreditNotePrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: cn } = await supabase
    .from('credit_notes')
    .select('id, doc_no, cn_date, amount, applied_amount, refunded_amount, sales_return_id, invoice_id, clients(project_name, company, contact_name, address, city, phone), invoices(doc_no, discounts), sales_returns!sales_return_id(doc_no, reason)')
    .eq('id', params.id)
    .single();
  if (!cn) notFound();
  const inv = one<{ doc_no: string | null; discounts: { label: string; percent: number; kind?: string }[] }>(cn.invoices);
  const ret = one<{ doc_no: string | null; reason: string | null }>(cn.sales_returns);
  const { data: items } = cn.sales_return_id
    ? await supabase.from('sales_return_items').select('sku, qty_returned, unit_price, subtotal').eq('sales_return_id', cn.sales_return_id)
    : { data: [] as { sku: string; qty_returned: number; unit_price: number; subtotal: number }[] };
  const { data: prods } = await supabase.from('products').select('sku, name, uom').in('sku', (items ?? []).map((i) => i.sku));
  const by = new Map((prods ?? []).map((p) => [p.sku as string, p as { name: string; uom: string }]));
  const rows = (items ?? []).map((it, i) => ({ no: i + 1, sku: it.sku, name: by.get(it.sku)?.name ?? '', qty: num(it.qty_returned), uom: by.get(it.sku)?.uom ?? '', price: num(it.unit_price), total: num(it.subtotal) }));
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);
  const { rows: totalRows } = buildTotals(subtotal, inv?.discounts ?? [], [], 'Nilai Credit Note');
  totalRows[totalRows.length - 1].value = rupiah(cn.amount);
  const balance = Number(cn.amount) - Number(cn.applied_amount) - Number(cn.refunded_amount);
  totalRows.push({ label: 'Dipakai ke Invoice:', value: rupiah(cn.applied_amount) }, { label: 'Direfund:', value: rupiah(cn.refunded_amount) }, { label: 'Saldo Kredit:', value: rupiah(balance), bold: true });

  return (
    <div>
      <PrintToolbar backHref="/dashboard/credit-notes" docNo={cn.doc_no} />
      <PrintDocument
        title="CREDIT NOTE"
        meta={[
          { label: 'Tgl Credit Note', value: dateShort(cn.cn_date) },
          { label: 'No Credit Note', value: cn.doc_no ?? '-' },
          { label: 'No Invoice', value: inv?.doc_no ?? '-' },
          { label: 'No Retur', value: ret?.doc_no ?? '-' },
        ]}
        parties={[{ label: 'Kepada Yth,', lines: clientLines(one<PrintClient>(cn.clients)) }]}
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
        notes={ret?.reason ? [`Alasan retur: ${ret.reason}`] : []}
        signatures={['Dibuat Oleh', 'Disetujui Oleh', 'Diterima Oleh']}
      />
    </div>
  );
}
