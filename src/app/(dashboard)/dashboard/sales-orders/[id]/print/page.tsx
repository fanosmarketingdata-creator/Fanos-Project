import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintModal from '@/components/PrintModal';
import { num, dateShort } from '@/lib/format';
import { buildTotals, one, type PrintClient } from '@/lib/print-helpers';

export default async function SalesOrderPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: so }, { data: items }] = await Promise.all([
    supabase
      .from('sales_orders')
      .select('*, clients(project_name, company, contact_name, address, city, phone)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('sales_order_items')
      .select('sku, qty, unit_price, total, notes, products(name, uom)')
      .eq('sales_order_id', params.id)
      .order('sort_order'),
  ]);
  if (!so) notFound();

  // Project: dari BOQ asal SO, atau dari Quotation asal SO (SO manual: project yang diisi di SO).
  let projName = '';
  let projLocation = '';
  type Proj = { name: string | null; location: string | null };
  const loadProj = async (id: string | null | undefined) => {
    if (!id) return null;
    const { data } = await supabase.from('projects').select('name, location').eq('id', id).maybeSingle();
    return (data as Proj | null) ?? null;
  };
  if (so.boq_project_id) {
    const { data: b } = await supabase.from('boq_projects').select('project_id, project_name').eq('id', so.boq_project_id).maybeSingle();
    const pr = await loadProj(b?.project_id);
    projName = pr?.name || b?.project_name || '';
    projLocation = pr?.location || '';
  }
  if (!projName && so.quotation_id) {
    const { data: q } = await supabase.from('quotations').select('project_id, project_name').eq('id', so.quotation_id).maybeSingle();
    const pr = await loadProj(q?.project_id);
    projName = pr?.name || q?.project_name || '';
    projLocation = pr?.location || '';
  }
  if (!projName) {
    const sx = so as { project_id?: string | null; project_name?: string | null };
    const pr = await loadProj(sx.project_id);
    projName = pr?.name || sx.project_name || '';
    projLocation = projLocation || pr?.location || '';
  }
  const cl = one<PrintClient>(so.clients);
  const toLines = [
    cl?.company || cl?.project_name || '-',
    projName,
    projLocation,
    cl?.contact_name ? `Up: ${cl.contact_name}` : '',
  ].filter(Boolean);

  const rows = (items ?? []).map((it, i) => {
    const p = one<{ name: string; uom: string }>(it.products);
    return { no: i + 1, sku: it.sku, name: p?.name ?? '', qty: num(it.qty), uom: p?.uom ?? '', price: num(it.unit_price), total: num(it.total), notes: it.notes ?? '' };
  });
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.total), 0);
  const { rows: totalRows } = buildTotals(subtotal, so.discounts, so.charges, 'Total SO');

  return (
    <PrintModal backHref="/dashboard/sales-orders" docNo={so.doc_no}>
      
      <PrintDocument
        title="SALES ORDER"
        meta={[
          { label: 'Tgl SO', value: dateShort(so.so_date) },
          { label: 'No SO', value: so.doc_no ?? '-' },
        ]}
        parties={[{ label: 'Kepada Yth,', lines: toLines }]}
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
    </PrintModal>
  );
}
