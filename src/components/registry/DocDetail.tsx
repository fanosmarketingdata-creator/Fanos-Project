import { DvCard } from './RegistryModal';
import StatusBadge from './StatusBadge';

export type DetailCard = { icon: string; label: string; value: React.ReactNode; color?: string };
export type DetailTable = {
  title: string;
  icon?: string;
  columns: { label: string; align?: 'l' | 'r' | 'c' }[];
  rows: (string | number)[][];
  empty?: string;
};
export type SummaryRow = { label: string; value: string; kind?: 'discount' | 'charge' | 'grand' };

export function DetailTop({ id, title, badge, amountLabel, amount }: { id: string; title: string; badge?: string; amountLabel?: string; amount?: string }) {
  return (
    <div className="dv2-topbar">
      <div>
        <div className="dv2-topbar-id">{id}</div>
        <div className="dv2-topbar-title">{title}</div>
        {badge && <div style={{ marginTop: 6 }}><StatusBadge status={badge} /></div>}
      </div>
      {amount && (
        <div className="dv2-topbar-amount">
          <div className="lbl">{amountLabel ?? 'Total'}</div>
          <div className="val">{amount}</div>
        </div>
      )}
    </div>
  );
}

export function DetailCards({ cards }: { cards: DetailCard[] }) {
  return (
    <div className="dv2-grid">
      {cards.map((c, i) => (
        <DvCard key={i} {...c} />
      ))}
    </div>
  );
}

export function DetailTableBlock({ t }: { t: DetailTable }) {
  const cls = (a?: string) => (a === 'l' ? 'tl' : a === 'r' ? 'tr' : undefined);
  return (
    <>
      <div className="dv2-section-title">
        <i className={t.icon ?? 'fi fi-rr-list'} /> {t.title}
      </div>
      {t.rows.length === 0 ? (
        <div className="dv2-empty">{t.empty ?? 'Belum terdapat data'}</div>
      ) : (
        <div className="dv2-table-wrap">
          <table className="dv2-table">
            <thead>
              <tr>
                {t.columns.map((c, i) => (
                  <th key={i} className={cls(c.align)}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j} className={cls(t.columns[j]?.align)}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function DetailSummary({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="dv2-summary">
      {rows.map((r, i) =>
        r.kind === 'grand' ? (
          <div key={i} className="dv2-summary-grand"><span>{r.label}</span><span>{r.value}</span></div>
        ) : (
          <div key={i} className={`dv2-summary-row ${r.kind ?? ''}`}><span>{r.label}</span><span>{r.value}</span></div>
        )
      )}
    </div>
  );
}

export function buildSummary(subtotal: number, discounts: { label: string; percent: number; kind?: string }[] = [], charges: { label: string; amount: number }[] = [], grandLabel = 'Total'): { rows: SummaryRow[]; total: number } {
  const r = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const rows: SummaryRow[] = [{ label: 'Sub Total', value: r(subtotal) }];
  let total = subtotal;
  discounts.filter((d) => d.kind !== 'tax').forEach((d) => {
    const a = (subtotal * (d.percent || 0)) / 100;
    total -= a;
    rows.push({ label: `Diskon${d.label ? ' ' + d.label : ''} (${d.percent}%)`, value: `- ${r(a)}`, kind: 'discount' });
  });
  // Pajak (+) dihitung dari Subtotal - Diskon.
  const base = total;
  discounts.filter((d) => d.kind === 'tax').forEach((d) => {
    const a = (base * (d.percent || 0)) / 100;
    total += a;
    rows.push({ label: `Pajak${d.label ? ' ' + d.label : ''} (${d.percent}%)`, value: `+ ${r(a)}`, kind: 'charge' });
  });
  charges.forEach((c) => {
    total += c.amount || 0;
    rows.push({ label: c.label || 'Biaya Tambahan', value: r(c.amount || 0), kind: 'charge' });
  });
  rows.push({ label: grandLabel, value: r(total), kind: 'grand' });
  return { rows, total };
}
