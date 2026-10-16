import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function OutstandingPage() {
  const supabase = createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, inv_date, status, grand_total, total_paid, remaining, clients(project_name)')
    .gt('remaining', 0)
    .order('inv_date', { ascending: true });

  const rows = (invoices ?? []).map((inv) => {
    const ageDays = Math.floor((Date.now() - new Date(inv.inv_date).getTime()) / 86400000);
    return {
      id: inv.id,
      inv_date: inv.inv_date,
      status: inv.status,
      grand_total: Number(inv.grand_total),
      total_paid: Number(inv.total_paid),
      remaining: Number(inv.remaining),
      age_days: ageDays,
      client_name: (inv.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
    };
  });

  const totalOutstanding = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-triangle-warning" />Outstanding</h1>
      <p className="mb-6 text-sm text-slate-500">Invoice yang belum lunas, diurutkan dari yang paling lama.</p>

      <div className="mb-5 w-fit rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold text-slate-400">Total Piutang</div>
        <div className="mt-1 text-lg font-bold text-red-600">Rp {totalOutstanding.toLocaleString('id-ID')}</div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Tanggal Invoice</th>
              <th className="px-4 py-3 font-semibold">Umur</th>
              <th className="px-4 py-3 font-semibold">Grand Total</th>
              <th className="px-4 py-3 font-semibold">Sisa</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Tidak ada piutang berjalan 🎉
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.inv_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      r.age_days > 60 ? 'bg-red-100 text-red-700' : r.age_days > 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.age_days} hari
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">Rp {r.grand_total.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 font-semibold text-red-600">Rp {r.remaining.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/invoices/${r.id}`}
                    className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    Catat Pembayaran
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
