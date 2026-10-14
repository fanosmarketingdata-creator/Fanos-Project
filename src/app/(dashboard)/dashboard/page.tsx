import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { rupiah, dateShort } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  // Superuser hanya punya menu Superuser, jadi langsung diarahkan ke sana.
  if (profile?.role === 'Superuser') redirect('/dashboard/team-members');

  const supabase = createClient();
  const now = new Date();
  const monthStart = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const sixMonthsAgo = isoDate(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const today = isoDate(now);

  const head = { count: 'exact' as const, head: true };

  const [
    { data: unpaid },
    { data: salesRows },
    { data: payThisMonth },
    { count: soRunning },
    { count: quoteDraft },
    { count: poOpen },
    { count: defectOpen },
    { data: reminders },
  ] = await Promise.all([
    supabase.from('invoices').select('remaining').gt('remaining', 0),
    supabase.from('invoices').select('grand_total, inv_date').gte('inv_date', sixMonthsAgo),
    supabase.from('payments').select('amount').gte('pay_date', monthStart),
    supabase.from('sales_orders').select('id', head).in('status', ['DRAFT', 'ONGOING']),
    supabase.from('quotations').select('id', head).eq('status', 'DRAFT'),
    supabase.from('purchase_orders').select('id', head).in('status', ['DRAFT', 'ORDERED']),
    supabase.from('defects').select('id', head).eq('status', 'OPEN'),
    supabase
      .from('reminders')
      .select('id, title, due_date')
      .eq('is_done', false)
      .lte('due_date', today)
      .order('due_date')
      .limit(5),
  ]);

  const totalOutstanding = (unpaid ?? []).reduce((s, r) => s + Number(r.remaining), 0);
  const salesThisMonth = (salesRows ?? [])
    .filter((r) => r.inv_date >= monthStart)
    .reduce((s, r) => s + Number(r.grand_total), 0);
  const paidThisMonth = (payThisMonth ?? []).reduce((s, r) => s + Number(r.amount), 0);

  // Penjualan (grand total invoice) per bulan, 6 bulan terakhir
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], total: 0 };
  });
  (salesRows ?? []).forEach((r) => {
    const d = new Date(r.inv_date);
    const b = buckets.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (b) b.total += Number(r.grand_total);
  });
  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Overview</h1>
      <p className="mb-6 text-sm text-slate-500">Selamat datang, {profile?.full_name ?? ''}.</p>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <Kpi label="Penjualan Bulan Ini" value={rupiah(salesThisMonth)} />
        <Kpi label="Pembayaran Diterima (Bulan Ini)" value={rupiah(paidThisMonth)} tone="emerald" />
        <Kpi label="Total Piutang" value={rupiah(totalOutstanding)} tone="red" href="/dashboard/outstanding" />
        <Kpi label="Invoice Belum Lunas" value={String((unpaid ?? []).length)} href="/dashboard/outstanding" />
        <Kpi label="Sales Order Berjalan" value={String(soRunning ?? 0)} href="/dashboard/sales-orders" />
        <Kpi label="Quotation Draft" value={String(quoteDraft ?? 0)} href="/dashboard/quotations" />
        <Kpi label="PO Belum Diterima" value={String(poOpen ?? 0)} href="/dashboard/purchase-orders" />
        <Kpi label="Defect Open" value={String(defectOpen ?? 0)} tone={(defectOpen ?? 0) > 0 ? 'red' : undefined} href="/dashboard/defects" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-700">Penjualan 6 Bulan Terakhir</h3>
          <div className="flex h-44 items-end gap-3">
            {buckets.map((b) => (
              <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div className="text-[10px] font-semibold text-slate-500">
                  {b.total > 0 ? (b.total / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : ''}
                </div>
                <div
                  className="w-full rounded-t-md bg-brand-500"
                  style={{ height: `${Math.max((b.total / maxTotal) * 80, b.total > 0 ? 3 : 0)}%` }}
                />
                <div className="text-[11px] text-slate-500">{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Perlu Perhatian</h3>
            <Link href="/dashboard/reminders" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Semua
            </Link>
          </div>
          {(reminders ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">Tidak ada reminder yang jatuh tempo 🎉</p>
          ) : (
            <div className="space-y-2">
              {(reminders ?? []).map((r) => (
                <div key={r.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-[13px] font-medium text-slate-800">{r.title}</div>
                  <div className={`text-[11px] ${r.due_date < today ? 'text-red-600' : 'text-amber-600'}`}>
                    {r.due_date < today ? 'Terlambat · ' : 'Hari ini · '}
                    {dateShort(r.due_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone, href }: { label: string; value: string; tone?: 'emerald' | 'red'; href?: string }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-slate-800';
  const card = (
    <div className="h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${toneClass}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
