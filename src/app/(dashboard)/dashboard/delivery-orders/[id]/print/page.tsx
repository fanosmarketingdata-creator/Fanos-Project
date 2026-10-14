import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { num, dateShort } from '@/lib/format';
import { clientLines, one, type PrintClient } from '@/lib/print-helpers';

export default async function DeliveryOrderPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: d }, { data: items }] = await Promise.all([
    supabase
      .from('delivery_orders')
      .select('id, doc_no, do_date, notes, sales_orders(doc_no, clients(project_name, company, contact_name, address, city, phone))')
      .eq('id', params.id)
      .single(),
    supabase.from('delivery_order_items').select('sku, qty_shipped, notes, products(name, uom)').eq('delivery_order_id', params.id),
  ]);
  if (!d) notFound();

  const so = one<{ doc_no: string | null; clients: unknown }>(d.sales_orders);
  const rows = (items ?? []).map((it, i) => {
    const p = one<{ name: string; uom: string }>(it.products);
    return { no: i + 1, sku: it.sku, name: p?.name ?? '', qty: num(it.qty_shipped), uom: p?.uom ?? '', notes: it.notes ?? '' };
  });

  return (
    <div>
      <PrintToolbar backHref={`/dashboard/delivery-orders/${d.id}`} docNo={d.doc_no} />
      <PrintDocument
        title="SURAT JALAN"
        meta={[
          { label: 'Tgl Kirim', value: dateShort(d.do_date) },
          { label: 'No Surat Jalan', value: d.doc_no ?? '-' },
          { label: 'No SO', value: so?.doc_no ?? '-' },
        ]}
        parties={[{ label: 'Kirim Ke,', lines: clientLines(one<PrintClient>(so?.clients)) }]}
        columns={[
          { key: 'no', label: 'No.', width: '6%', align: 'center' },
          { key: 'sku', label: 'Item', width: '18%', align: 'left' },
          { key: 'name', label: 'Nama Barang', align: 'left' },
          { key: 'qty', label: 'Qty', width: '9%', align: 'center' },
          { key: 'uom', label: 'Unit', width: '9%', align: 'center' },
          { key: 'notes', label: 'Keterangan', width: '20%', align: 'left' },
        ]}
        rows={rows}
        notes={d.notes ? [`Catatan: ${d.notes}`] : []}
        signatures={['Disiapkan Oleh', 'Dikirim Oleh', 'Diterima Oleh']}
      />
    </div>
  );
}
