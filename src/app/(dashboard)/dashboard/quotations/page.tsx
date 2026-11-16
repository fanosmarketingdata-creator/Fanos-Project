import { createClient } from '@/lib/supabase/server';
import QuotationListTable from './QuotationListTable';
import { orThrow } from '@/lib/query';

export default async function QuotationsPage() {
  const supabase = createClient();
  const { data: quotes } = orThrow(await supabase
    .from('quotations')
    .select('id, doc_no, quote_date, status, total_amount, project_name, projects(name), boq_projects(project_name), clients(project_name)')
    .order('quote_date', { ascending: false }));

  const rows = (quotes ?? []).map((q) => ({
    id: q.id,
    doc_no: q.doc_no,
    quote_date: q.quote_date,
    status: q.status,
    total_amount: Number(q.total_amount),
    client_name:
      (q.projects as unknown as { name: string } | null)?.name ||
      q.project_name ||
      (q.boq_projects as unknown as { project_name: string } | null)?.project_name ||
      (q.clients as unknown as { project_name: string } | null)?.project_name ||
      '-',
  }));

  return (
    <div>
      <QuotationListTable initialRows={rows} />
    </div>
  );
}
