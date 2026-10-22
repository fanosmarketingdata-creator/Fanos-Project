import { createClient } from '@/lib/supabase/server';
import BOQProjectListTable from './BOQProjectListTable';

export default async function BOQProjectPage() {
  const supabase = createClient();
  const { data: boqs } = await supabase
    .from('boq_projects')
    .select('id, doc_no, project_name, boq_date, status, progress, clients(project_name), boq_project_items(count)')
    .order('boq_date', { ascending: false });

  const rows = (boqs ?? []).map((b) => ({
    id: b.id,
    doc_no: (b.doc_no as string | null) ?? null,
    project_name: b.project_name,
    boq_date: b.boq_date,
    status: b.status,
    progress: b.progress,
    client_name: (b.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    item_count: (b.boq_project_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <div>
      <h1 className="page-title"><i className="fa-solid fa-layer-group" />BOQ Project</h1>
      <p className="mb-6 text-sm text-slate-500">Bill of Quantity per proyek — Area → Sub-area → Item.</p>
      <BOQProjectListTable initialRows={rows} />
    </div>
  );
}
