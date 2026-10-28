'use client';

import '@/styles/pm.css';

export type Member = { id: string; name: string; role_title: string | null; photo_url?: string | null };

const COLORS = ['#3563e9', '#0ea5a4', '#8b5cf6', '#e11d48', '#d97706', '#0891b2', '#16a34a', '#db2777'];
const colorOf = (s: string) => COLORS[Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') || '?';

export function Avatar({ m }: { m: Pick<Member, 'name' | 'photo_url'> }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (m.photo_url) return <img src={m.photo_url} alt={m.name} title={m.name} className="pm-av" />;
  return <span className="pm-av" title={m.name} style={{ background: colorOf(m.name) }}>{initials(m.name)}</span>;
}

export function AvatarStack({ members, max = 4, size }: { members: Pick<Member, 'name' | 'photo_url'>[]; max?: number; size?: 'lg' }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <span className={`pm-avs ${size ?? ''}`}>
      {shown.map((m, i) => <Avatar key={i} m={m} />)}
      {rest > 0 && <span className="pm-av more">+{rest}</span>}
    </span>
  );
}

const STATUS_CLS: Record<string, string> = { 'In Progress': 'pm-b-prog', Completed: 'pm-b-done', Planning: 'pm-b-plan', 'On Hold': 'pm-b-hold' };
export const StatusPill = ({ s }: { s: string }) => <span className={`pm-badge ${STATUS_CLS[s] ?? 'pm-b-hold'}`}>{s}</span>;
const PRIO_CLS: Record<string, string> = { High: 'pm-p-high', Medium: 'pm-p-med', Low: 'pm-p-low' };
export const PriorityPill = ({ p }: { p: string }) => <span className={`pm-badge ${PRIO_CLS[p] ?? 'pm-p-low'}`}>{p} Priority</span>;

export function Progress({ pct }: { pct: number }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="pm-prog">
      <div className="lbl"><span>Progress</span><b>{v}%</b></div>
      <div className="bar"><i style={{ width: `${v}%` }} /></div>
    </div>
  );
}

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-';

export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
