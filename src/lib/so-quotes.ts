// Opsi Quotation untuk form Sales Order: hanya yang belum dipakai Sales Order lain.
export type QuoteOption = { id: string; doc_no: string; client_name: string; total_amount: number; status: string };

export function toQuoteOptions(
  quotes: unknown[] | null,
  usedSO: { quotation_id: string | null }[] | null,
  keepId?: string | null
): QuoteOption[] {
  const used = new Set((usedSO ?? []).map((s) => s.quotation_id).filter(Boolean));
  return ((quotes ?? []) as { id: string; doc_no: string; status: string; total_amount: number; clients: { project_name: string } | { project_name: string }[] | null }[])
    .filter((q) => q.id === keepId || !used.has(q.id))
    .map((q) => {
      const c = Array.isArray(q.clients) ? q.clients[0] : q.clients;
      return { id: q.id, doc_no: q.doc_no, client_name: c?.project_name ?? '', total_amount: Number(q.total_amount) || 0, status: q.status };
    });
}
