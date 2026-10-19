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
      <h1 className="page-title"><i className="fi fi-rr-apps" />Overview</h1>
      <p className="mb-4 text-xs text-slate-400">Selamat datang, {profile?.full_name ?? ''}.</p>

      <div className="dash-kpi-row">
        <Kpi icon="fi fi-rr-chart-histogram" color="#2563eb" label="Penjualan Bulan Ini" value={rupiah(salesThisMonth)} />
        <Kpi icon="fi fi-rr-money-bill-wave" color="#16a34a" label="Pembayaran Diterima (Bulan Ini)" value={rupiah(paidThisMonth)} />
        <Kpi icon="fi fi-rr-triangle-warning" color="#dc2626" label="Total Piutang" value={rupiah(totalOutstanding)} href="/dashboard/outstanding" />
        <Kpi icon="fi fi-rr-receipt" color="#d97706" label="Invoice Belum Lunas" value={String((unpaid ?? []).length)} href="/dashboard/outstanding" />
      </div>

      <div className="dash-section-title"><i className="fi fi-rr-refresh" /> Pipeline & Operasional</div>
      <div className="dash-kpi-row">
        <Kpi icon="fi fi-rr-shopping-cart" color="#2563eb" label="Sales Order Berjalan" value={String(soRunning ?? 0)} href="/dashboard/sales-orders" />
        <Kpi icon="fi fi-rr-file-invoice" color="#7c3aed" label="Quotation Draft" value={String(quoteDraft ?? 0)} href="/dashboard/quotations" />
        <Kpi icon="fi fi-rr-truck-loading" color="#0891b2" label="PO Belum Diterima" value={String(poOpen ?? 0)} href="/dashboard/purchase-orders" />
        <Kpi
          icon="fi fi-rr-clipboard-list-check"
          color={(defectOpen ?? 0) > 0 ? '#dc2626' : '#16a34a'}
          label="Defect Open"
          value={String(defectOpen ?? 0)}
          href="/dashboard/defects"
        />
      </div>

      <div className="dash-grid-2" style={{ gridTemplateColumns: undefined }}>
        <div className="dash-panel">
          <div className="dash-panel-title"><i className="fi fi-rr-chart-histogram" /> Penjualan 6 Bulan Terakhir</div>
          <div className="flex h-44 items-end gap-2 sm:gap-3">
            {buckets.map((b) => (
              <div key={b.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <div className="text-[10px] font-semibold text-slate-500">
                  {b.total > 0 ? (b.total / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : ''}
                </div>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${Math.max((b.total / maxTotal) * 80, b.total > 0 ? 3 : 0)}%`,
                    background: 'linear-gradient(180deg,#3b82f6,#2563eb)',
                  }}
                />
                <div className="text-[11px] text-slate-500">{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-title" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="fi fi-rr-bell" /> Perlu Perhatian</span>
            <Link href="/dashboard/reminders" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              Semua
            </Link>
          </div>
          {(reminders ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">Tidak terdapat reminder yang jatuh tempo.</p>
          ) : (
            <div>
              {(reminders ?? []).map((r) => (
                <div key={r.id} className="dash-activity-item">
                  <div
                    className="dash-activity-icon"
                    style={{ background: r.due_date < today ? '#fee2e2' : '#fef3c7', color: r.due_date < today ? '#dc2626' : '#d97706' }}
                  >
                    <i className="fi fi-rr-bell" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800">{r.title}</div>
                    <div className={`text-[11px] ${r.due_date < today ? 'text-red-600' : 'text-amber-600'}`}>
                      {r.due_date < today ? 'Terlambat · ' : 'Hari ini · '}
                      {dateShort(r.due_date)}
                    </div>
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

function Kpi({ icon, color, label, value, href }: { icon: string; color: string; label: string; value: string; href?: string }) {
  const card = (
    <div className="dash-kpi">
      <div className="dash-kpi-icon" style={{ background: `${color}1a`, color }}>
        <i className={icon} />
      </div>
      <div className="min-w-0">
        <div className="dash-kpi-val" style={{ color, fontSize: value.length > 12 ? 18 : undefined }}>{value}</div>
        <div className="dash-kpi-lbl">{label}</div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{card}</Link> : card;
}
