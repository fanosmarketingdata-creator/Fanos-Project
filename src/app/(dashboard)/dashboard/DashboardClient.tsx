'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Select from '@/components/ui/Select';
import { pmHealth } from '@/lib/pm-health';
import '@/styles/dash.css';

export type DashData = {
  name: string;
  today: string;
  months: { y: number; m: number; sales: number; purchases: number; cashIn: number; cashOut: number }[];
  days: { date: string; cashIn: number; cashOut: number }[];
  pipeline: Record<'cur' | 'prev', { quoteN: number; quoteV: number; soN: number; soV: number; poN: number }>;
  daily: Record<'cur' | 'prev', { sales: number; paid: number }[]>;
  receivable: { total: number; count: number; payable: number; status: Record<string, number>; collected: number; billed: number };
  topOpen: { id: string; doc_no: string; client: string; remaining: number; inv_date: string }[];
  projects: { id: string; name: string; status: string; priority: string; end_date: string | null; owner: string; total: number; done: number; overdueTasks: number }[];
  weeks: { label: string; total: number; done: number }[];
  reminders: { id: string; title: string; due_date: string }[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BLUE = '#3563e9';
const BLUE_SOFT = '#9db6f7';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const RED = '#ef4444';

const idr = (v: number) => 'Rp ' + Math.round(v).toLocaleString('id-ID');
function compact(v: number) {
  const a = Math.abs(v);
  const f = (x: number) => x.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  if (a >= 1e9) return f(v / 1e9) + ' M';
  if (a >= 1e6) return f(v / 1e6) + ' jt';
  if (a >= 1e3) return f(v / 1e3) + ' rb';
  return String(Math.round(v));
}
function pct(cur: number, prev: number): number | null {
  if (!prev) return cur ? 100 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}
function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return step * p;
}
function fmtDate(s: string | null) {
  if (!s) return '-';
  const d = new Date(s + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function Trend({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="dx-trend flat">—</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`dx-trend ${good ? 'good' : 'bad'}`}>
      <i className={`fi ${up ? 'fi-rr-arrow-small-up' : 'fi-rr-arrow-small-down'}`} />
      {Math.abs(value).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
    </span>
  );
}

function Panel({ title, right, href, children, className = '' }: { title: string; right?: React.ReactNode; href?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`dx-panel ${className}`}>
      <div className="dx-ph">
        <h3>{title}</h3>
        <div className="dx-ph-r">
          {right}
          {href && <Link href={href} className="dx-go" title="Buka"><i className="fi fi-rr-arrow-up-right" /></Link>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ---------- Grafik batang berkelompok ---------- */
function BarChart({ labels, a, b, nameA, nameB }: { labels: string[]; a: number[]; b: number[]; nameA: string; nameB: string }) {
  const [hi, setHi] = useState<number | null>(null);
  const [hide, setHide] = useState<{ a: boolean; b: boolean }>({ a: false, b: false });
  const W = 640, H = 230, L = 46, B = 28, T = 10, R = 6;
  const max = niceMax(Math.max(1, ...(hide.a ? [] : a), ...(hide.b ? [] : b)));
  const n = labels.length;
  const gw = (W - L - R) / n;
  const bw = Math.min(26, gw * 0.3);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  return (
    <div className="dx-chart">
      <div className="dx-legend">
        <button type="button" className={hide.a ? 'off' : ''} onClick={() => setHide((h) => ({ ...h, a: !h.a }))}><i style={{ background: BLUE }} />{nameA}</button>
        <button type="button" className={hide.b ? 'off' : ''} onClick={() => setHide((h) => ({ ...h, b: !h.b }))}><i style={{ background: BLUE_SOFT }} />{nameB}</button>
      </div>
      <div className="dx-svgwrap" onMouseLeave={() => setHi(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#eef1f7" />
              <text x={L - 8} y={y(t) + 4} textAnchor="end" className="dx-tick">{compact(t)}</text>
            </g>
          ))}
          {labels.map((lb, i) => {
            const cx = L + gw * i + gw / 2;
            const on = hi === i;
            return (
              <g key={i} onMouseEnter={() => setHi(i)} onClick={() => setHi(i)} style={{ cursor: 'pointer' }}>
                <rect x={L + gw * i} y={T} width={gw} height={H - T - B} fill={on ? '#f3f6fe' : 'transparent'} rx={8} />
                {!hide.a && <rect x={cx - bw - 2} y={y(a[i])} width={bw} height={Math.max(0, H - B - y(a[i]))} rx={6} fill={BLUE} className="dx-bar" />}
                {!hide.b && <rect x={cx + 2} y={y(b[i])} width={bw} height={Math.max(0, H - B - y(b[i]))} rx={6} fill={BLUE_SOFT} className="dx-bar" />}
                <text x={cx} y={H - 8} textAnchor="middle" className={`dx-tick ${on ? 'on' : ''}`}>{lb}</text>
              </g>
            );
          })}
        </svg>
        {hi !== null && (
          <div className="dx-tip" style={{ left: `${((L + gw * hi + gw / 2) / W) * 100}%` }}>
            <b>{labels[hi]}</b>
            {!hide.a && <div><i style={{ background: BLUE }} />{nameA}<span>{idr(a[hi])}</span></div>}
            {!hide.b && <div><i style={{ background: BLUE_SOFT }} />{nameB}<span>{idr(b[hi])}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Grafik garis (smooth) ---------- */
type LS = { name: string; color: string; values: number[] };
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return d;
}
function LineChart({ labels, series, H = 180, axis = true, fill = false, tickEvery = 1 }: { labels: string[]; series: LS[]; H?: number; axis?: boolean; fill?: boolean; tickEvery?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const W = 560, L = axis ? 44 : 6, B = axis ? 24 : 4, T = 8, R = 8;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i: number) => L + ((W - L - R) * i) / Math.max(1, n - 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 1, 2, 3].map((i) => (max / 3) * i);
  function move(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (n - 1));
    setHi(Math.max(0, Math.min(n - 1, i)));
  }
  return (
    <div className="dx-svgwrap" ref={ref} onMouseMove={move} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        {axis && ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#eef1f7" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="dx-tick">{compact(t)}</text>
          </g>
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number]);
          const d = smooth(pts);
          return (
            <g key={s.name}>
              {fill && si === 0 && d && <path d={`${d} L${x(n - 1)},${H - B} L${x(0)},${H - B} Z`} fill={s.color} opacity={0.08} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinecap="round" />
              {hi !== null && <circle cx={x(hi)} cy={y(s.values[hi])} r={4.5} fill="#fff" stroke={s.color} strokeWidth={2.4} />}
            </g>
          );
        })}
        {hi !== null && <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} stroke="#cbd5e1" strokeDasharray="3 3" />}
        {axis && labels.map((lb, i) => (i % tickEvery === 0 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className={`dx-tick ${hi === i ? 'on' : ''}`}>{lb}</text> : null))}
      </svg>
      {hi !== null && (
        <div className="dx-tip" style={{ left: `${(x(hi) / W) * 100}%` }}>
          <b>{labels[hi]}</b>
          {series.map((s) => <div key={s.name}><i style={{ background: s.color }} />{s.name}<span>{idr(s.values[hi])}</span></div>)}
        </div>
      )}
    </div>
  );
}

export default function DashboardClient({ data }: { data: DashData }) {
  const router = useRouter();
  const [mounted] = useState(() => Date.now());
  const [ago, setAgo] = useState(0);
  const [spin, setSpin] = useState(false);
  const [perfRange, setPerfRange] = useState('6');
  const [pipeMonth, setPipeMonth] = useState<'cur' | 'prev'>('cur');
  const [snapMonth, setSnapMonth] = useState<'cur' | 'prev'>('cur');
  const [cashRange, setCashRange] = useState('14');
  const [wk, setWk] = useState<number | null>(null);
  const [seg, setSeg] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAgo(Math.floor((Date.now() - mounted) / 60000)), 20000);
    return () => clearInterval(t);
  }, [mounted]);

  function refresh() {
    setSpin(true);
    router.refresh();
    setTimeout(() => { setSpin(false); setAgo(0); }, 900);
  }

  const M = data.months;
  const cur = M[11], prev = M[10], prev2 = M[9];

  /* ---- KPI ---- */
  const activeProjects = data.projects.filter((p) => p.status === 'In Progress').length;
  const overdueProjects = data.projects.filter((p) => pmHealth({ status: p.status, end_date: p.end_date, total: p.total, done: p.done, overdueTasks: p.overdueTasks }, data.today) === 'overdue').length;

  /* ---- kinerja bisnis ---- */
  const rangeN = Number(perfRange);
  const perf = M.slice(12 - rangeN);
  const perfLabels = perf.map((m) => MONTHS[m.m]);

  /* ---- pipeline ---- */
  const pp = data.pipeline[pipeMonth];
  const dlyAll = data.daily[pipeMonth];
  const lastDay = pipeMonth === 'cur' ? Math.min(dlyAll.length, new Date(data.today + 'T00:00:00').getDate()) : dlyAll.length;
  let accS = 0, accP = 0;
  const dly = dlyAll.slice(0, lastDay).map((d) => ({ sales: (accS += d.sales), paid: (accP += d.paid) }));
  const dayLabels = dly.map((_, i) => String(i + 1));

  /* ---- arus kas ---- */
  const cashN = Number(cashRange);
  const cd = data.days.slice(30 - cashN);
  const cashLabels = cd.map((d) => String(new Date(d.date + 'T00:00:00').getDate()));

  /* ---- snapshot ---- */
  const sm = snapMonth === 'cur' ? cur : prev;
  const sp = snapMonth === 'cur' ? prev : prev2;
  const net = sm.cashIn - sm.cashOut;
  const netPrev = sp.cashIn - sp.cashOut;

  /* ---- produktivitas ---- */
  const wTotal = data.weeks.reduce((s, w) => s + w.total, 0);
  const wDone = data.weeks.reduce((s, w) => s + w.done, 0);
  const wPct = wTotal ? Math.round((wDone / wTotal) * 100) : 0;
  const wSel = wk !== null ? data.weeks[wk] : null;

  /* ---- piutang ---- */
  const r = data.receivable;
  const segs = [
    { k: 'PAID', label: 'Lunas', color: GREEN, v: r.status.PAID ?? 0 },
    { k: 'PARTIAL', label: 'Sebagian', color: AMBER, v: r.status.PARTIAL ?? 0 },
    { k: 'UNPAID', label: 'Belum Lunas', color: RED, v: r.status.UNPAID ?? 0 },
  ];
  const segTotal = segs.reduce((s, x) => s + x.v, 0) || 1;
  const collectedPct = r.billed ? Math.round((r.collected / r.billed) * 100) : 0;

  return (
    <div className="dx">
      <div className="dx-head">
        <div>
          <h1>Dashboard Overview</h1>
          <p><span>Selamat datang,</span> <b>{data.name}</b>. <span>Ringkasan performa bisnis Anda hari ini.</span></p>
        </div>
        <div className="dx-updated">
          <span>Diperbarui</span>
          {ago === 0 ? <span>baru saja</span> : <><span>{ago}</span><span>menit lalu</span></>}
          <button type="button" onClick={refresh} title="Refresh" className={spin ? 'spin' : ''}><i className="fi fi-rr-refresh" /></button>
        </div>
      </div>

      {/* KPI */}
      <div className="dx-kpis">
        <Link href="/dashboard/invoices" className="dx-kpi">
          <div className="dx-ki" style={{ background: '#e8f7f1', color: GREEN }}><i className="fi fi-rr-chart-histogram" /></div>
          <div className="dx-kb">
            <span className="dx-kl">Penjualan Bulan Ini</span>
            <b className="dx-kv" title={idr(cur.sales)}>{idr(cur.sales)}</b>
            <div className="dx-kt"><Trend value={pct(cur.sales, prev.sales)} /><span>vs bulan lalu</span></div>
          </div>
        </Link>
        <Link href="/dashboard/outstanding" className="dx-kpi">
          <div className="dx-ki" style={{ background: '#fdeceb', color: RED }}><i className="fi fi-rr-receipt" /></div>
          <div className="dx-kb">
            <span className="dx-kl">Total Piutang</span>
            <b className="dx-kv" title={idr(r.total)}>{idr(r.total)}</b>
            <div className="dx-kt"><span className="dx-n">{r.count}</span><span>invoice belum lunas</span></div>
          </div>
        </Link>
        <Link href="/dashboard/purchase-invoice" className="dx-kpi">
          <div className="dx-ki" style={{ background: '#eaf1ff', color: BLUE }}><i className="fi fi-rr-money-bill-wave" /></div>
          <div className="dx-kb">
            <span className="dx-kl">Total Utang Vendor</span>
            <b className="dx-kv" title={idr(r.payable)}>{idr(r.payable)}</b>
            <div className="dx-kt"><Trend value={pct(cur.purchases, prev.purchases)} invert /><span>pembelian vs bulan lalu</span></div>
          </div>
        </Link>
        <Link href="/dashboard/project-management" className="dx-kpi">
          <div className="dx-ki" style={{ background: '#fff4e3', color: AMBER }}><i className="fi fi-rr-chart-tree" /></div>
          <div className="dx-kb">
            <span className="dx-kl">Project Aktif</span>
            <b className="dx-kv">{activeProjects}</b>
            <div className="dx-kt">{overdueProjects > 0 ? <><span className="dx-n bad">{overdueProjects}</span><span>project terlambat</span></> : <span>Semua sesuai jadwal</span>}</div>
          </div>
        </Link>
      </div>

      {/* Kinerja + Pipeline */}
      <div className="dx-row r-7-5">
        <Panel
          title="Kinerja Bisnis"
          href="/dashboard/invoices"
          right={
            <Select value={perfRange} onChange={(e) => setPerfRange(e.target.value)} className="dx-sel">
              <option value="3">3 Bulan Terakhir</option>
              <option value="6">6 Bulan Terakhir</option>
              <option value="12">12 Bulan Terakhir</option>
            </Select>
          }
        >
          <BarChart labels={perfLabels} a={perf.map((m) => m.sales)} b={perf.map((m) => m.purchases)} nameA="Penjualan" nameB="Pembelian" />
        </Panel>

        <Panel
          title="Pipeline"
          href="/dashboard/sales-orders"
          right={
            <Select value={pipeMonth} onChange={(e) => setPipeMonth(e.target.value as 'cur' | 'prev')} className="dx-sel">
              <option value="cur">Bulan Ini</option>
              <option value="prev">Bulan Lalu</option>
            </Select>
          }
        >
          <div className="dx-pipe">
            <div className="dx-pipe-l">
              <Link href="/dashboard/sales-orders" className="dx-stat">
                <b>{pp.soN}</b><span>Sales Order Berjalan</span>
              </Link>
              <Link href="/dashboard/quotations" className="dx-stat">
                <b>{pp.quoteN}</b><span>Quotation Terbuka</span>
                <em>{idr(pp.quoteV)}</em>
              </Link>
              <Link href="/dashboard/purchase-orders" className="dx-stat">
                <b>{pp.poN}</b><span>PO Belum Diterima</span>
              </Link>
            </div>
            <div className="dx-pipe-r">
              <div className="dx-pv"><span>Nilai SO Berjalan</span><b>{idr(pp.soV)}</b></div>
              <LineChart
                labels={dayLabels}
                tickEvery={Math.ceil(dayLabels.length / 6)}
                H={210}
                axis={false}
                fill
                series={[
                  { name: 'Penjualan', color: BLUE, values: dly.map((d) => d.sales) },
                  { name: 'Pembayaran', color: AMBER, values: dly.map((d) => d.paid) },
                ]}
              />
              <div className="dx-legend sm"><span><i style={{ background: BLUE }} />Penjualan</span><span><i style={{ background: AMBER }} />Pembayaran</span><span className="dx-cap">Kumulatif per hari</span></div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Produktivitas + Piutang terbesar + Perlu perhatian */}
      <div className="dx-row r-4-4-4">
        <Panel title="Produktivitas Task" href="/dashboard/project-management">
          <div className="dx-big">{wPct}<small>%</small></div>
          <p className="dx-muted">
            {wSel ? (<><span>{wSel.done}</span> <span>dari</span> <span>{wSel.total}</span> <span>task selesai pada minggu ini</span></>) : (<><span>{wDone}</span> <span>dari</span> <span>{wTotal}</span> <span>task bulan ini selesai</span></>)}
          </p>
          <div className="dx-weeks">
            {data.weeks.map((w, i) => {
              const p = w.total ? Math.round((w.done / w.total) * 100) : 0;
              return (
                <button key={w.label} type="button" className={`dx-week ${wk === i ? 'on' : ''}`} onClick={() => setWk(wk === i ? null : i)}>
                  <div className="t"><span>{`Minggu ${i + 1}`}</span><b>{w.total ? p + '%' : '-'}</b></div>
                  <div className="bar"><i style={{ width: `${p}%` }} /></div>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title="Piutang Terbesar" href="/dashboard/outstanding">
          {data.topOpen.length === 0 ? (
            <div className="dx-empty">Tidak ada piutang berjalan.</div>
          ) : (
            <div className="dx-list">
              {data.topOpen.map((o) => (
                <Link key={o.id} href="/dashboard/outstanding" className="dx-li">
                  <div className="av">{(o.client[0] ?? '?').toUpperCase()}</div>
                  <div className="tx"><b>{o.client}</b><span>{o.doc_no} · {fmtDate(o.inv_date)}</span></div>
                  <div className="am">{idr(o.remaining)}</div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Perlu Perhatian" href="/dashboard/reminders">
          {data.reminders.length === 0 ? (
            <div className="dx-empty">Tidak terdapat reminder yang jatuh tempo.</div>
          ) : (
            <div className="dx-list">
              {data.reminders.map((rm) => {
                const late = rm.due_date < data.today;
                return (
                  <Link key={rm.id} href="/dashboard/reminders" className="dx-li">
                    <div className="av" style={{ background: late ? '#fdeceb' : '#fff4e3', color: late ? RED : AMBER }}><i className="fi fi-rr-bell" /></div>
                    <div className="tx"><b>{rm.title}</b><span>{fmtDate(rm.due_date)}</span></div>
                    <span className={`dx-pill ${late ? 'overdue' : 'risk'}`}>{late ? 'Terlambat' : 'Hari ini'}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Arus kas + Snapshot + Piutang */}
      <div className="dx-row r-4-3-5">
        <Panel
          title="Arus Kas Harian"
          href="/dashboard/payments"
          right={
            <Select value={cashRange} onChange={(e) => setCashRange(e.target.value)} className="dx-sel">
              <option value="7">7 Hari</option>
              <option value="14">14 Hari</option>
              <option value="30">30 Hari</option>
            </Select>
          }
        >
          <LineChart
            labels={cashLabels}
            tickEvery={cashN > 14 ? 4 : cashN > 7 ? 2 : 1}
            H={190}
            fill
            series={[
              { name: 'Kas Masuk', color: GREEN, values: cd.map((d) => d.cashIn) },
              { name: 'Kas Keluar', color: RED, values: cd.map((d) => d.cashOut) },
            ]}
          />
          <div className="dx-legend sm"><span><i style={{ background: GREEN }} />Kas Masuk</span><span><i style={{ background: RED }} />Kas Keluar</span></div>
        </Panel>

        <Panel
          title="Ringkasan Keuangan"
          right={
            <Select value={snapMonth} onChange={(e) => setSnapMonth(e.target.value as 'cur' | 'prev')} className="dx-sel">
              <option value="cur">Bulan Ini</option>
              <option value="prev">Bulan Lalu</option>
            </Select>
          }
        >
          <div className="dx-snap">
            <div><span>Kas Masuk</span><b title={idr(sm.cashIn)}>{compact(sm.cashIn)}</b><Trend value={pct(sm.cashIn, sp.cashIn)} /></div>
            <div><span>Kas Keluar</span><b title={idr(sm.cashOut)}>{compact(sm.cashOut)}</b><Trend value={pct(sm.cashOut, sp.cashOut)} invert /></div>
            <div className="net"><span>Saldo Bersih</span><b className={net < 0 ? 'neg' : ''} title={idr(net)}>{net < 0 ? '-' : '+'}{compact(Math.abs(net))}</b><Trend value={pct(net, netPrev)} /></div>
          </div>
        </Panel>

        <Panel title="Piutang" href="/dashboard/outstanding">
          <div className="dx-rc">
            <div className="dx-rc-top">
              <div className="dx-big sm">{collectedPct}<small>%</small></div>
              <span className="dx-muted">tertagih dari total tagihan 12 bulan terakhir</span>
            </div>
            <div className="dx-seg" onMouseLeave={() => setSeg(null)}>
              {segs.map((s) => (
                <Link key={s.k} href="/dashboard/outstanding" onMouseEnter={() => setSeg(s.k)} className={seg && seg !== s.k ? 'dim' : ''} style={{ width: `${(s.v / segTotal) * 100}%`, background: s.color }} title={`${s.label}: ${idr(s.v)}`} />
              ))}
            </div>
            <div className="dx-segl">
              {segs.map((s) => (
                <div key={s.k} className={seg === s.k ? 'on' : ''} onMouseEnter={() => setSeg(s.k)} onMouseLeave={() => setSeg(null)}>
                  <span><i style={{ background: s.color }} />{s.label}</span>
                  <b>{compact(s.v)}</b>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
