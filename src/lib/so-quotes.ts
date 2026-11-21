// Opsi Quotation untuk form Sales Order.
// Quotation yang sudah dipakai Sales Order lain (atau ditolak/dibatalkan) tetap TAMPIL tetapi tidak
// bisa dipilih, lengkap dengan alasannya, supaya jelas kenapa tidak bisa dipakai lagi.
export type QuoteOption = { id: string; doc_no: string; client_name: string; total_amount: number; status: string; blocked?: string };

export function toQuoteOptions(
  quotes: unknown[] | null,
  usedSO: { quotation_id: string | null; doc_no?: string | null }[] | null,
  keepId?: string | null
): QuoteOption[] {
  const used = new Map<string, string>();
  for (const s of usedSO ?? []) if (s.quotation_id) used.set(s.quotation_id, s.doc_no ?? 'Sales Order lain');
  return ((quotes ?? []) as { id: string; doc_no: string; status: string; total_amount: number; clients: { project_name: string } | { project_name: string }[] | null }[])
    .map((q) => {
      const c = Array.isArray(q.clients) ? q.clients[0] : q.clients;
      let blocked: string | undefined;
      if (q.id !== keepId) {
        if (used.has(q.id)) blocked = `Sudah dipakai ${used.get(q.id)}`;
        else if (q.status === 'REJECTED' || q.status === 'CANCELLED') blocked = q.status;
      }
      return { id: q.id, doc_no: q.doc_no, client_name: c?.project_name ?? '', total_amount: Number(q.total_amount) || 0, status: q.status, blocked };
    });
}
