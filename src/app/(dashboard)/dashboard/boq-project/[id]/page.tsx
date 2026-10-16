import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BOQProjectForm from '../BOQProjectForm';
import type { BOQAreaInput, BOQProjectInput } from '../actions';

export default async function EditBOQProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: boq }, { data: items }, { data: clients }, { data: products }] = await Promise.all([
    supabase.from('boq_projects').select('*').eq('id', params.id).single(),
    supabase
      .from('boq_project_items')
      .select('area_name, sub_area_name, product_id, sku, qty, uom, kode_gambar, sort_order')
      .eq('boq_project_id', params.id)
      .order('sort_order'),
    supabase.from('clients').select('id, project_name').order('project_name'),
    supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
  ]);

  if (!boq) notFound();

  // Rekonstruksi flat items -> struktur Area > Sub-area > Item bersarang
  const areas: BOQAreaInput[] = [];
  (items ?? []).forEach((it) => {
    let area = areas.find((a) => a.name === it.area_name);
    if (!area) {
      area = { name: it.area_name, subAreas: [] };
      areas.push(area);
    }
    let sub = area.subAreas.find((s) => s.name === it.sub_area_name);
    if (!sub) {
      sub = { name: it.sub_area_name, items: [] };
      area.subAreas.push(sub);
    }
    sub.items.push({
      product_id: it.product_id,
      sku: it.sku,
      qty: Number(it.qty),
      uom: it.uom ?? '',
      kode_gambar: it.kode_gambar ?? '',
    });
  });

  const initial: BOQProjectInput = {
    id: boq.id,
    project_name: boq.project_name,
    client_id: boq.client_id,
    boq_date: boq.boq_date,
    status: boq.status,
    progress: boq.progress,
    route_type: boq.route_type,
    areas,
  };

  return (
    <div>
      <h1 className="page-title"><i className="fa-solid fa-layer-group" />Edit BOQ Project</h1>
      <p className="mb-6 text-sm text-slate-500">{boq.project_name}</p>
      <BOQProjectForm clients={clients ?? []} products={products ?? []} initial={initial} />
    </div>
  );
}
