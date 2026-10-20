import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop } from '@/components/registry/DocDetail';
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
    <DetailShell title="Detail BOQ Akumulasi" icon="fi fi-rr-calculator" backHref="/dashboard/boq-akumulasi">
      <DetailTop id={`Client: ${clientName}`} title={boq.project_name} />
      <AkumulasiDetailTable boqProjectId={boq.id} initialRows={rows ?? []} />
    </DetailShell>
  );
}
