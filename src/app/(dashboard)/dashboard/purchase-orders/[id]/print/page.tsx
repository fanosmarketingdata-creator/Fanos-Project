import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { COMPANY } from '@/lib/company';
import { rupiah, num, dateShort } from '@/lib/format';
import { one } from '@/lib/print-helpers';

type Vendor = { company: string; contact_name: string | null; address: string | null; phone: string | null };

export default async function POPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: po }, { data: items }] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select('id, doc_no, po_date, status, notes, vendors(company, contact_name, address, phone)')
      .eq('id', params.id)
      .single(),
    supabase.from('purchase_order_items').select('sku, description, qty, uom, unit_price, subtotal').eq('purchase_order_id', params.id),
  ]);
  if (!po) notFound();

  const v = one<Vendor>(po.vendors);
  const vendorLines = v
    ? [v.company, v.address ?? '', v.contact_name ? `Up: ${v.contact_name}${v.phone ? ' ' + v.phone : ''}` : v.phone ?? ''].filter(Boolean)
    : ['-'];

  const rows = (items ?? []).map((it, i) => ({
    no: i + 1,
    sku: it.sku,
    name: it.description ?? '',
    qty: num(it.qty),
    uom: it.uom ?? '',
    price: num(it.unit_price),
    total: num(it.subtotal),
  }));
  const total = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);

  return (
    <div>
      <PrintToolbar backHref="/dashboard/purchase-orders" docNo={po.doc_no} />
      <PrintDocument
        title="PURCHASE ORDER"
        meta={[
          { label: 'Tgl PO', value: dateShort(po.po_date) },
          { label: 'No PO', value: po.doc_no ?? '-' },
          { label: 'Status', value: po.status },
        ]}
        parties={[
          { label: 'Kepada Yth (Vendor),', lines: vendorLines },
          { label: 'Dikirim Ke,', lines: [COMPANY.name, COMPANY.address] },
        ]}
        columns={[
          { key: 'no', label: 'No.', width: '5%', align: 'center' },
          { key: 'sku', label: 'Item', width: '16%', align: 'left' },
          { key: 'name', label: 'Nama Barang', align: 'left' },
          { key: 'qty', label: 'Qty', width: '7%', align: 'center' },
          { key: 'uom', label: 'Unit', width: '7%', align: 'center' },
          { key: 'price', label: 'Harga Beli', width: '15%', align: 'right' },
          { key: 'total', label: 'Jumlah', width: '15%', align: 'right' },
        ]}
        rows={rows}
        totals={[{ label: 'Total PO:', value: rupiah(total), bold: true }]}
        notes={po.notes ? [`Catatan: ${po.notes}`] : []}
        signatures={['Dibuat Oleh', 'Disetujui Oleh', 'Diterima Vendor']}
      />
    </div>
  );
}
