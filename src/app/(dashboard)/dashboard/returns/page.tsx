import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function ReturnsPage() {
  const supabase = createClient();
  const { data: returns } = await supabase
    .from('sales_returns')
    .select('id, return_date, reason, status, clients(project_name), sales_return_items(subtotal)')
    .order('return_date', { ascending: false });

  const rows = (returns ?? []).map((r) => ({
    id: r.id,
    return_date: r.return_date,
    reason: r.reason,
    status: r.status,
    client_name: (r.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    total: ((r.sales_return_items as unknown as { subtotal: number }[]) ?? []).reduce((s, it) => s + Number(it.subtotal), 0),
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold text-slate-800">Retur Penjualan</h1>
          <p className="text-sm text-slate-500">Pengembalian barang dari client — otomatis menerbitkan Credit Note.</p>
        </div>
        <Link
          href="/dashboard/returns/new"
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Buat Retur
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Nilai Retur</th>
              <th className="px-4 py-3 font-semibold">Alasan</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada retur
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.return_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">Rp {r.total.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-slate-500">{r.reason || '-'}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
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
