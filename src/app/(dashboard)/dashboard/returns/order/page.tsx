import { createClient } from '@/lib/supabase/server';
import ReturnListTable from '../ReturnListTable';

export default async function ReturnOrderPage() {
  const supabase = createClient();
  const { data: returns } = await supabase
    .from('sales_returns')
    .select('id, doc_no, return_date, reason, status, clients(project_name), invoices(doc_no), sales_return_items(subtotal), credit_notes!credit_note_id(doc_no)')
    .eq('kind', 'ORDER')
    .order('return_date', { ascending: false });

  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (returns ?? []).map((r) => ({
    id: r.id as string,
    doc_no: (r.doc_no as string | null) ?? null,
    return_date: r.return_date as string,
    reason: (r.reason as string | null) ?? null,
    status: r.status as string,
    client_name: one<{ project_name: string }>(r.clients)?.project_name ?? '-',
    invoice_no: one<{ doc_no: string | null }>(r.invoices)?.doc_no ?? '-',
    cn_no: one<{ doc_no: string | null }>(r.credit_notes)?.doc_no ?? null,
    total: ((r.sales_return_items as unknown as { subtotal: number }[]) ?? []).reduce((s, it) => s + Number(it.subtotal), 0),
  }));

  return (
    <div>
      <ReturnListTable kind="order" rows={rows} />
    </div>
  );
}
