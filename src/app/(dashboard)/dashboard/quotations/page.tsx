import { createClient } from '@/lib/supabase/server';
import QuotationListTable from './QuotationListTable';

export default async function QuotationsPage() {
  const supabase = createClient();
  const { data: quotes } = await supabase
    .from('quotations')
    .select('id, quote_date, status, total_amount, clients(project_name)')
    .order('quote_date', { ascending: false });

  const rows = (quotes ?? []).map((q) => ({
    id: q.id,
    quote_date: q.quote_date,
    status: q.status,
    total_amount: Number(q.total_amount),
    client_name: (q.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Quotations</h1>
      <p className="mb-6 text-sm text-slate-500">Penawaran harga ke client.</p>
      <QuotationListTable initialRows={rows} />
    </div>
  );
}
