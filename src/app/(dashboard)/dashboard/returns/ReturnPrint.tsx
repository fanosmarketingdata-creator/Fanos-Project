import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { rupiah, num, dateShort } from '@/lib/format';
import { clientLines, one, type PrintClient } from '@/lib/print-helpers';

export default async function ReturnPrint({ id, kind }: { id: string; kind: 'order' | 'invoice' }) {
  const supabase = createClient();
  const [{ data: r }, { data: items }] = await Promise.all([
    supabase
      .from('sales_returns')
      .select('id, doc_no, return_date, reason, clients(project_name, company, contact_name, address, city, phone), invoices(doc_no), credit_notes!credit_note_id(doc_no, amount)')
      .eq('id', id)
      .single(),
    supabase.from('sales_return_items').select('sku, qty_returned, unit_price, subtotal, condition').eq('sales_return_id', id),
  ]);
  if (!r) notFound();
  const inv = one<{ doc_no: string | null }>(r.invoices);
  const cn = one<{ doc_no: string | null; amount: number }>(r.credit_notes);
  const { data: prods } = await supabase.from('products').select('sku, name, uom').in('sku', (items ?? []).map((i) => i.sku));
  const by = new Map((prods ?? []).map((p) => [p.sku as string, p as { name: string; uom: string }]));
  const rows = (items ?? []).map((it, i) => ({
    no: i + 1, sku: it.sku, name: by.get(it.sku)?.name ?? '', qty: num(it.qty_returned), uom: by.get(it.sku)?.uom ?? '',
    cond: it.condition, price: num(it.unit_price), total: num(it.subtotal),
  }));
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);
  const totals = [{ label: 'Nilai Retur:', value: rupiah(subtotal) }];
  if (kind === 'invoice' && cn) totals.push({ label: 'Nilai Credit Note:', value: rupiah(cn.amount) });

  return (
    <div>
      <PrintToolbar backHref={`/dashboard/returns/${kind}/${r.id}/view`} docNo={r.doc_no} />
      <PrintDocument
        title={kind === 'order' ? 'RETURN ORDER' : 'RETURN INVOICE'}
        meta={[
          { label: 'Tgl Retur', value: dateShort(r.return_date) },
          { label: 'No Retur', value: r.doc_no ?? '-' },
          { label: 'No Invoice', value: inv?.doc_no ?? '-' },
          ...(kind === 'invoice' ? [{ label: 'No Credit Note', value: cn?.doc_no ?? '-' }] : []),
        ]}
        parties={[{ label: 'Client,', lines: clientLines(one<PrintClient>(r.clients)) }]}
        columns={[
          { key: 'no', label: 'No.', width: '5%', align: 'center' },
          { key: 'sku', label: 'Item', width: '16%', align: 'left' },
          { key: 'name', label: 'Nama Barang', align: 'left' },
          { key: 'qty', label: 'Qty', width: '7%', align: 'center' },
          { key: 'uom', label: 'Unit', width: '7%', align: 'center' },
          ...(kind === 'order' ? [{ key: 'cond', label: 'Kondisi', width: '9%', align: 'center' as const }] : []),
          { key: 'price', label: 'Harga Satuan', width: '14%', align: 'right' },
          { key: 'total', label: 'Jumlah', width: '14%', align: 'right' },
        ]}
        rows={rows}
        totals={totals}
        notes={r.reason ? [`Alasan: ${r.reason}`] : []}
        signatures={['Dibuat Oleh', 'Diterima Oleh', 'Disetujui Oleh']}
      />
    </div>
  );
}
