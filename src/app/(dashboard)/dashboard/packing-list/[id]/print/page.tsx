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
      .select('id, doc_no, pl_date, ship_to, packed_by, notes, clients(project_name, company, contact_name, address, city, phone), sales_orders(doc_no, boq_projects(project_name), quotations(boq_projects(project_name)))')
      .eq('id', params.id)
      .single(),
    supabase.from('packing_list_items').select('sku, qty, colli, weight, remarks, products(name, uom)').eq('packing_list_id', params.id).order('sort_order'),
  ]);
  if (!p) notFound();
  const c = one<{ project_name: string; company: string | null; contact_name: string | null; address: string | null; city: string | null; phone: string | null }>(p.clients);
  const so = one<{ doc_no: string | null; boq_projects: unknown; quotations: unknown }>(p.sales_orders);
  const direct = one<{ project_name: string }>(so?.boq_projects)?.project_name;
  const viaQuote = one<{ boq_projects: unknown }>(so?.quotations);
  const project = direct ?? one<{ project_name: string }>(viaQuote?.boq_projects)?.project_name ?? '';

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
      rows={(items ?? []).map((i, n) => {
        const pr = one<{ name: string; uom: string }>(i.products);
        return { no: n + 1, sku: i.sku, name: pr?.name ?? '', qty: num(i.qty), uom: pr?.uom ?? '', colli: num(i.colli), weight: num(i.weight), remarks: i.remarks ?? '' };
      })}
      totals={{
        qty: num((items ?? []).reduce((s, i) => s + Number(i.qty), 0)),
        colli: num((items ?? []).reduce((s, i) => s + Number(i.colli), 0)),
        weight: num((items ?? []).reduce((s, i) => s + Number(i.weight), 0)),
      }}
    />
  );
}
