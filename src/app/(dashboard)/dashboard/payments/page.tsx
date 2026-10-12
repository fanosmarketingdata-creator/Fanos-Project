import { createClient } from '@/lib/supabase/server';

export default async function PaymentsPage() {
  const supabase = createClient();
  const { data: payments } = await supabase
    .from('payments')
    .select('id, pay_date, amount, method, reference_no, invoices(id, clients(project_name))')
    .order('pay_date', { ascending: false });

  const rows = (payments ?? []).map((p) => {
    const invoice = p.invoices as unknown as { id: string; clients: { project_name: string } | null } | null;
    return {
      id: p.id,
      pay_date: p.pay_date,
      amount: Number(p.amount),
      method: p.method,
      reference_no: p.reference_no,
      client_name: invoice?.clients?.project_name ?? '-',
    };
  });

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Payments</h1>
      <p className="mb-6 text-sm text-slate-500">Riwayat semua pembayaran dari client.</p>

      <div className="mb-5 w-fit rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold text-slate-400">Total Diterima</div>
        <div className="mt-1 text-lg font-bold text-emerald-600">Rp {total.toLocaleString('id-ID')}</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Jumlah</th>
              <th className="px-4 py-3 font-semibold">Metode</th>
              <th className="px-4 py-3 font-semibold">No. Referensi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada pembayaran
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.pay_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">Rp {r.amount.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-slate-600">{r.method || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.reference_no || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
