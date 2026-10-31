import { createClient } from '@/lib/supabase/server';
import CreditNoteTable from './CreditNoteTable';
import { orThrow } from '@/lib/query';

export default async function CreditNotesPage() {
  const supabase = createClient();
  const { data: notes } = orThrow(await supabase
    .from('credit_notes')
    // credit_notes <-> sales_returns punya 2 foreign key (saling menunjuk): sebut kolomnya (!sales_return_id)
    .select('id, doc_no, cn_date, amount, applied_amount, refunded_amount, status, clients(project_name), invoices(doc_no), sales_returns!sales_return_id(doc_no)')
    .order('cn_date', { ascending: false }));

  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (notes ?? []).map((n) => ({
    id: n.id as string,
    doc_no: (n.doc_no as string | null) ?? null,
    cn_date: n.cn_date as string,
    amount: Number(n.amount),
    applied: Number(n.applied_amount),
    refunded: Number(n.refunded_amount),
    status: n.status as string,
    client_name: one<{ project_name: string }>(n.clients)?.project_name ?? '-',
    invoice_no: one<{ doc_no: string | null }>(n.invoices)?.doc_no ?? '-',
    return_no: one<{ doc_no: string | null }>(n.sales_returns)?.doc_no ?? '-',
  }));

  return (
    <div>
      <CreditNoteTable initialRows={rows} />
    </div>
  );
}
