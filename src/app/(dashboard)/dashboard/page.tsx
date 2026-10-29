import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import DashboardClient, { type DashData } from './DashboardClient';

function iso(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().split('T')[0];
}
const n = (v: unknown) => Number(v ?? 0) || 0;

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  // Superuser hanya punya menu Superuser, jadi langsung diarahkan ke sana.
  if (profile?.role === 'Superuser') redirect('/dashboard/team-members');

  const supabase = createClient();
  const now = new Date();
  const today = iso(now);
  const from12 = iso(new Date(now.getFullYear(), now.getMonth() - 11, 1));
  const from30 = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));

  const [inv, pay, pinv, ppay, quo, so, po, openInv, openPinv, pmp, pmt, pmc, rem] = await Promise.all([
    supabase.from('invoices').select('inv_date, grand_total, total_paid, status').gte('inv_date', from12),
    supabase.from('payments').select('pay_date, amount').gte('pay_date', from12),
    supabase.from('purchase_invoices').select('inv_date, grand_total').gte('inv_date', from12),
    supabase.from('purchase_payments').select('pay_date, amount').gte('pay_date', from12),
    supabase.from('quotations').select('quote_date, status, total_amount').gte('quote_date', from12),
    supabase.from('sales_orders').select('so_date, status, total_amount').gte('so_date', from12),
    supabase.from('purchase_orders').select('po_date, status').gte('po_date', from12),
    supabase.from('invoices').select('id, doc_no, remaining, inv_date, clients(company, project_name)').gt('remaining', 0).order('remaining', { ascending: false }).limit(200),
    supabase.from('purchase_invoices').select('remaining').gt('remaining', 0),
    supabase.from('pm_projects').select('id, name, status, priority, start_date, end_date, owner_id, team_members(name)').order('created_at', { ascending: false }),
    supabase.from('pm_tasks').select('project_id, column_id, status, due_date'),
    supabase.from('pm_columns').select('id, is_done'),
    supabase.from('reminders').select('id, title, due_date').eq('is_done', false).lte('due_date', today).order('due_date').limit(8),
  ]);

  // ---- 12 bulan ----
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, y: d.getFullYear(), m: d.getMonth(), sales: 0, purchases: 0, cashIn: 0, cashOut: 0 };
  });
  const bucket = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
  };
  (inv.data ?? []).forEach((r) => { const b = bucket(r.inv_date as string); if (b) b.sales += n(r.grand_total); });
  (pinv.data ?? []).forEach((r) => { const b = bucket(r.inv_date as string); if (b) b.purchases += n(r.grand_total); });
  (pay.data ?? []).forEach((r) => { const b = bucket(r.pay_date as string); if (b) b.cashIn += n(r.amount); });
  (ppay.data ?? []).forEach((r) => { const b = bucket(r.pay_date as string); if (b) b.cashOut += n(r.amount); });

  // ---- 30 hari arus kas ----
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
    return { date: iso(d), cashIn: 0, cashOut: 0 };
  });
  (pay.data ?? []).forEach((r) => { const x = days.find((d) => d.date === r.pay_date); if (x) x.cashIn += n(r.amount); });
  (ppay.data ?? []).forEach((r) => { const x = days.find((d) => d.date === r.pay_date); if (x) x.cashOut += n(r.amount); });

  // ---- pipeline (bulan ini & bulan lalu) ----
  const thisKey = months[11].key;
  const lastKey = months[10].key;
  const monthOf = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    return k === thisKey ? 'cur' : k === lastKey ? 'prev' : null;
  };
  const pipeline = {
    cur: { quoteN: 0, quoteV: 0, soN: 0, soV: 0, poN: 0 },
    prev: { quoteN: 0, quoteV: 0, soN: 0, soV: 0, poN: 0 },
  };
  (quo.data ?? []).forEach((r) => {
    const k = monthOf(r.quote_date as string);
    if (k && ['DRAFT', 'APPROVED'].includes(r.status as string)) { pipeline[k].quoteN++; pipeline[k].quoteV += n(r.total_amount); }
  });
  (so.data ?? []).forEach((r) => {
    const k = monthOf(r.so_date as string);
    if (k && !['COMPLETED', 'CANCELLED'].includes(r.status as string)) { pipeline[k].soN++; pipeline[k].soV += n(r.total_amount); }
  });
  (po.data ?? []).forEach((r) => {
    const k = monthOf(r.po_date as string);
    if (k && ['DRAFT', 'ORDERED'].includes(r.status as string)) pipeline[k].poN++;
  });
  // titik harian penjualan vs pembayaran untuk grafik kecil pipeline
  const dim = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const mkDaily = (mm: { y: number; m: number }, key: 'cur' | 'prev') => {
    const arr = Array.from({ length: dim(mm.y, mm.m) }, () => ({ sales: 0, paid: 0 }));
    (inv.data ?? []).forEach((r) => { if (monthOf(r.inv_date as string) === key) arr[new Date((r.inv_date as string) + 'T00:00:00').getDate() - 1].sales += n(r.grand_total); });
    (pay.data ?? []).forEach((r) => { if (monthOf(r.pay_date as string) === key) arr[new Date((r.pay_date as string) + 'T00:00:00').getDate() - 1].paid += n(r.amount); });
    return arr;
  };
  const daily = { cur: mkDaily(months[11], 'cur'), prev: mkDaily(months[10], 'prev') };

  // ---- piutang ----
  const st = { PAID: 0, PARTIAL: 0, UNPAID: 0 } as Record<string, number>;
  let collected = 0;
  let billed = 0;
  (inv.data ?? []).forEach((r) => {
    const k = (r.status as string) in st ? (r.status as string) : 'UNPAID';
    st[k] += n(r.grand_total);
    billed += n(r.grand_total);
    collected += n(r.total_paid);
  });
  const receivableRows = openInv.data ?? [];
  const receivable = receivableRows.reduce((s, r) => s + n(r.remaining), 0);
  const payable = (openPinv.data ?? []).reduce((s, r) => s + n(r.remaining), 0);
  const topOpen = receivableRows.slice(0, 5).map((r) => {
    const c = r.clients as unknown as { company: string | null; project_name: string } | null;
    return { id: r.id as string, doc_no: (r.doc_no as string) ?? '-', client: c?.company || c?.project_name || '-', remaining: n(r.remaining), inv_date: r.inv_date as string };
  });

  // ---- project ----
  const doneCols = new Set((pmc.data ?? []).filter((c) => c.is_done).map((c) => c.id as string));
  const isDone = (t: { column_id: unknown; status: unknown }) => (t.column_id ? doneCols.has(t.column_id as string) : t.status === 'Completed');
  const tasks = pmt.data ?? [];
  const projects = (pmp.data ?? []).map((p) => {
    const ts = tasks.filter((t) => t.project_id === p.id);
    const done = ts.filter(isDone).length;
    const overdueTasks = ts.filter((t) => !isDone(t) && t.due_date && (t.due_date as string) < today).length;
    return {
      id: p.id as string,
      name: p.name as string,
      status: p.status as string,
      priority: p.priority as string,
      end_date: (p.end_date as string | null) ?? null,
      owner: (p.team_members as unknown as { name: string } | null)?.name ?? '-',
      total: ts.length,
      done,
      overdueTasks,
    };
  });

  // produktivitas task bulan ini (due date per minggu)
  const weeks = [0, 1, 2, 3].map((i) => ({ label: `W${i + 1}`, total: 0, done: 0 }));
  tasks.forEach((t) => {
    if (!t.due_date) return;
    const d = new Date((t.due_date as string) + 'T00:00:00');
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
    const w = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
    weeks[w].total++;
    if (isDone(t)) weeks[w].done++;
  });

  const data: DashData = {
    name: profile?.full_name ?? '',
    today,
    months: months.map((m) => ({ y: m.y, m: m.m, sales: m.sales, purchases: m.purchases, cashIn: m.cashIn, cashOut: m.cashOut })),
    days,
    pipeline,
    daily,
    receivable: { total: receivable, count: receivableRows.length, payable, status: st, collected, billed },
    topOpen,
    projects,
    weeks,
    reminders: (rem.data ?? []).map((r) => ({ id: r.id as string, title: r.title as string, due_date: r.due_date as string })),
  };

  return <DashboardClient data={data} />;
}
