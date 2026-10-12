import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AkumulasiDetailTable from './AkumulasiDetailTable';

export default async function AkumulasiDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: boq }, { data: rows }] = await Promise.all([
    supabase.from('boq_projects').select('id, project_name, clients(project_name)').eq('id', params.id).single(),
    supabase.from('boq_akumulasi').select('id, sku, qty, uom').eq('boq_project_id', params.id).order('sku'),
  ]);

  if (!boq) notFound();
  const clientName = (boq.clients as unknown as { project_name: string } | null)?.project_name ?? '-';

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">BOQ Akumulasi — {boq.project_name}</h1>
      <p className="mb-6 text-sm text-slate-500">Client: {clientName}</p>
      <AkumulasiDetailTable boqProjectId={boq.id} initialRows={rows ?? []} />
    </div>
  );
}
