import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { num, dateShort } from '@/lib/format';
import { buildTotals, clientLines, one, type PrintClient } from '@/lib/print-helpers';

export default async function SalesOrderPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: so }, { data: items }] = await Promise.all([
    supabase
      .from('sales_orders')
      .select('id, doc_no, so_date, discounts, charges, global_notes, clients(project_name, company, contact_name, address, city, phone)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('sales_order_items')
      .select('sku, qty, unit_price, total, notes, products(name, uom)')
      .eq('sales_order_id', params.id)
      .order('sort_order'),
  ]);
  if (!so) notFound();

  const rows = (items ?? []).map((it, i) => {
    const p = one<{ name: string; uom: string }>(it.products);
    return { no: i + 1, sku: it.sku, name: p?.name ?? '', qty: num(it.qty), uom: p?.uom ?? '', price: num(it.unit_price), total: num(it.total), notes: it.notes ?? '' };
  });
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.total), 0);
  const { rows: totalRows } = buildTotals(subtotal, so.discounts, so.charges, 'Total SO');

  return (
    <div>
      <PrintToolbar backHref="/dashboard/sales-orders" docNo={so.doc_no} />
      <PrintDocument
        title="SALES ORDER"
        meta={[
          { label: 'Tgl SO', value: dateShort(so.so_date) },
          { label: 'No SO', value: so.doc_no ?? '-' },
        ]}
        parties={[{ label: 'Kepada Yth,', lines: clientLines(one<PrintClient>(so.clients)) }]}
        columns={[
          { key: 'no', label: 'No.', width: '5%', align: 'center' },
          { key: 'sku', label: 'Item', width: '15%', align: 'left' },
          { key: 'name', label: 'Nama Barang', align: 'left' },
          { key: 'qty', label: 'Qty', width: '6%', align: 'center' },
          { key: 'uom', label: 'Unit', width: '6%', align: 'center' },
          { key: 'price', label: 'Harga Satuan', width: '13%', align: 'right' },
          { key: 'total', label: 'Jumlah', width: '13%', align: 'right' },
          { key: 'notes', label: 'Ket', width: '12%', align: 'left' },
        ]}
        rows={rows}
        totals={totalRows}
        notes={so.global_notes ? [`Catatan: ${so.global_notes}`] : []}
        signatures={['Disiapkan Oleh', 'Disetujui Oleh', 'Diterima Oleh']}
      />
    </div>
  );
}
