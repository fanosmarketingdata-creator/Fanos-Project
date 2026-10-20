import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards } from '@/components/registry/DocDetail';
import BoqDetailTabs, { type BoqRepoArea, type BoqSynth } from '../../BoqDetailTabs';
import { dateShort } from '@/lib/format';

export default async function BOQProjectViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: boq }, { data: items }] = await Promise.all([
    supabase.from('boq_projects').select('id, project_name, boq_date, status, progress, route_type, clients(project_name)').eq('id', params.id).single(),
    supabase.from('boq_project_items').select('area_name, sub_area_name, sku, qty, uom, kode_gambar, sort_order, products(name)').eq('boq_project_id', params.id).order('sort_order'),
  ]);
  if (!boq) notFound();

  const areas: BoqRepoArea[] = [];
  const synthMap = new Map<string, BoqSynth>();
  (items ?? []).forEach((it) => {
    const name = (it.products as unknown as { name: string } | null)?.name ?? '';
    let a = areas.find((x) => x.name === it.area_name);
    if (!a) { a = { name: it.area_name, count: 0, subs: [] }; areas.push(a); }
    let s = a.subs.find((x) => x.name === it.sub_area_name);
    if (!s) { s = { name: it.sub_area_name, items: [] }; a.subs.push(s); }
    s.items.push({ sku: it.sku, name, qty: Number(it.qty), uom: it.uom ?? '', kode: it.kode_gambar ?? '' });
    a.count++;
    const cur = synthMap.get(it.sku);
    if (cur) cur.qty += Number(it.qty);
    else synthMap.set(it.sku, { sku: it.sku, name, qty: Number(it.qty), uom: it.uom ?? '' });
  });

  const client = (boq.clients as unknown as { project_name: string } | null)?.project_name ?? '-';
  return (
    <DetailShell title="Detail BOQ Project" icon="fa-solid fa-layer-group" backHref="/dashboard/boq-project" editHref={`/dashboard/boq-project/${boq.id}`}>
      <DetailTop id={`BOQ · ${dateShort(boq.boq_date)}`} title={boq.project_name} badge={boq.status} />
      <DetailCards
        cards={[
          { icon: 'fi fi-rr-user', label: 'Client', value: client },
          { icon: 'fi fi-rr-building', label: 'Total Area', value: areas.length },
          { icon: 'fi fi-rr-box', label: 'Total SKU Unik', value: synthMap.size },
          { icon: 'fi fi-rr-chart-line-up', label: 'Progress', value: boq.progress },
          { icon: 'fi fi-rr-route', label: 'Alur Dokumen', value: boq.route_type === 'so' ? 'Langsung ke Sales Order' : 'Via Quotation' },
        ]}
      />
      <BoqDetailTabs areas={areas} synth={Array.from(synthMap.values())} />
    </DetailShell>
  );
}
