import { createClient } from '@/lib/supabase/server';
import AkumulasiListTable from './AkumulasiListTable';

export default async function BOQAkumulasiPage() {
  const supabase = createClient();
  const { data: boqs } = await supabase
    .from('boq_projects')
    .select('id, project_name, boq_date, clients(project_name), boq_akumulasi(count)')
    .order('boq_date', { ascending: false });

  const rows = (boqs ?? []).map((b) => ({
    id: b.id,
    project_name: b.project_name,
    boq_date: b.boq_date,
    client_name: (b.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    sku_count: (b.boq_akumulasi as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">BOQ Akumulasi</h1>
      <p className="mb-6 text-sm text-slate-500">
        Rekap total qty per SKU dari BOQ Project — dihitung otomatis, dipakai untuk kebutuhan pembelian.
      </p>
      <AkumulasiListTable initialRows={rows} />
    </div>
  );
}
