import { createClient } from '@/lib/supabase/server';

export default async function CreditNotesPage() {
  const supabase = createClient();
  const { data: notes } = await supabase
    .from('credit_notes')
    // credit_notes <-> sales_returns punya 2 foreign key (saling menunjuk),
    // jadi relasinya harus disebut eksplisit lewat kolom (!sales_return_id)
    // supaya PostgREST tidak error "ambiguous relationship".
    .select('id, cn_date, amount, status, clients(project_name), sales_returns!sales_return_id(reason)')
    .order('cn_date', { ascending: false });

  const rows = (notes ?? []).map((n) => ({
    id: n.id,
    cn_date: n.cn_date,
    amount: Number(n.amount),
    status: n.status,
    client_name: (n.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    reason: (n.sales_returns as unknown as { reason: string | null } | null)?.reason ?? null,
  }));

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-badge-percent" />Credit Notes</h1>
      <p className="mb-6 text-sm text-slate-500">Nota kredit yang terbit otomatis dari Retur Penjualan.</p>

      <div className="mb-5 w-fit rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold text-slate-400">Total Credit Note Diterbitkan</div>
        <div className="mt-1 text-lg font-bold text-slate-800">Rp {total.toLocaleString('id-ID')}</div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Nilai</th>
              <th className="px-4 py-3 font-semibold">Alasan Retur</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum terdapat data credit note
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.cn_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">Rp {r.amount.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-slate-500">{r.reason || '-'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-bold uppercase text-indigo-700">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
