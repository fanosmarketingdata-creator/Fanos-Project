import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { one } from '@/lib/print-helpers';
import { num } from '@/lib/format';
import PackingLetter from './PackingLetter';

export default async function PackingPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: p }, { data: items }] = await Promise.all([
    supabase
      .from('packing_lists')
      .select('id, doc_no, pl_date, ship_to, packed_by, notes, clients(project_name, company, contact_name, address, city, phone), sales_orders(id, doc_no, boq_projects(project_name), quotations(boq_projects(project_name)))')
      .eq('id', params.id)
      .single(),
    supabase.from('packing_list_items').select('sku, qty, colli, package_type, units_per_package, net_weight, gross_weight, length_cm, width_cm, height_cm, cbm, remarks, products(name, uom)').eq('packing_list_id', params.id).order('sort_order'),
  ]);
  if (!p) notFound();
  const c = one<{ project_name: string; company: string | null; contact_name: string | null; address: string | null; city: string | null; phone: string | null }>(p.clients);
  const so = one<{ id: string; doc_no: string | null; boq_projects: unknown; quotations: unknown }>(p.sales_orders);
  const direct = one<{ project_name: string }>(so?.boq_projects)?.project_name;
  const viaQuote = one<{ boq_projects: unknown }>(so?.quotations);
  const project = direct ?? one<{ project_name: string }>(viaQuote?.boq_projects)?.project_name ?? '';

  let invoiceNo = '';
  if (so?.id) {
    const { data: inv } = await supabase.from('invoices').select('doc_no').eq('sales_order_id', so.id).order('inv_date').limit(3);
    invoiceNo = (inv ?? []).map((x) => x.doc_no).filter(Boolean).join(', ');
  }

  return (
    <PackingLetter
      docNo={p.doc_no ?? '-'}
      dateIso={String(p.pl_date).slice(0, 10)}
      soNo={so?.doc_no ?? '-'}
      project={project || ''}
      company={c?.company || c?.project_name || '-'}
      contact={c?.contact_name ?? ''}
      phone={c?.phone ?? ''}
      shipTo={p.ship_to || [c?.address, c?.city].filter(Boolean).join(', ')}
      packedBy={p.packed_by ?? ''}
      notes={p.notes ?? ''}
      invoiceNo={invoiceNo}
      rows={(items ?? []).map((i, n) => {
        const pr = one<{ name: string; uom: string }>(i.products);
        return { no: n + 1, sku: i.sku, name: pr?.name ?? '', uom: pr?.uom ?? '', package_type: i.package_type, packages: Number(i.colli), units: num(i.units_per_package), qty: num(i.qty), nw: Number(i.net_weight), gw: Number(i.gross_weight), l: num(i.length_cm), w: num(i.width_cm), h: num(i.height_cm), cbm: Number(i.cbm), remarks: i.remarks ?? '' };
      })}
    />
  );
}
