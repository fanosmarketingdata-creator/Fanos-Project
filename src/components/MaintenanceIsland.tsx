'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/components/I18nProvider';

type Tone = 'info' | 'danger';

// "Dynamic island": pill hitam kecil yang melebar jadi kartu. Dipakai di halaman maintenance (otomatis terbuka)
// dan sebagai peringatan di dashboard (klik untuk membuka/menutup).
export default function MaintenanceIsland({
  variant, title, subtitle, message, eta, scheduledAt, tone = 'info', gears, children,
}: {
  variant: 'page' | 'notice';
  title: string;
  subtitle?: string;
  message?: string;
  eta?: string;
  scheduledAt?: string;
  tone?: Tone;
  gears?: boolean; // ikon roda gigi beranimasi di dalam kartu
  children?: React.ReactNode;
}) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (variant !== 'page') return;
    const t = setTimeout(() => setOpen(true), 650);
    return () => clearTimeout(t);
  }, [variant]);

  const fmt = (iso: string) => {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return iso; // data lama: teks bebas
    return new Date(t).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';
  };
  const when = scheduledAt ? fmt(scheduledAt) : '';
  const etaText = eta ? fmt(eta) : '';

  return (
    <div className={`mi mi-${variant} mi-${tone}${open ? ' mi-open' : ''}`} role="status" aria-live="polite">
      <div className="mi-card" onClick={variant === 'notice' ? () => setOpen((o) => !o) : undefined} style={variant === 'notice' ? { cursor: 'pointer' } : undefined}>
        <div className="mi-head">
          <span className="mi-dot" aria-hidden />
          <span className="mi-title">{title}</span>
          {subtitle && <span className="mi-sub" data-no-i18n>{subtitle}</span>}
          {variant === 'notice' && <i className="fi fi-rr-angle-small-down mi-chev" aria-hidden />}
        </div>
        <div className="mi-body"><div className="mi-body-in">
          {gears && (
            <div className="mi-gears" aria-hidden>
              <svg viewBox="0 0 90 64" width="96" height="68">
                <g transform="translate(30 34)"><g className="mi-gear mi-gear-a">
                  <circle r="17" fill="none" stroke="#fbbf24" strokeWidth="7" strokeDasharray="5.34 5.34" />
                  <circle r="13" fill="none" stroke="#fbbf24" strokeWidth="4" />
                  <circle r="4.5" fill="#fbbf24" />
                </g></g>
                <g transform="translate(64 20)"><g className="mi-gear mi-gear-b">
                  <circle r="11" fill="none" stroke="#9aa4b2" strokeWidth="5" strokeDasharray="4.3 4.3" />
                  <circle r="8" fill="none" stroke="#9aa4b2" strokeWidth="3" />
                  <circle r="3" fill="#9aa4b2" />
                </g></g>
              </svg>
            </div>
          )}
          {message && <p className="mi-msg">{message}</p>}
          {when && <p className="mi-eta">Jadwal: <b data-no-i18n>{when}</b></p>}
          {etaText && <p className="mi-eta">Perkiraan selesai: <b data-no-i18n>{etaText}</b></p>}
          {children}
        </div></div>
      </div>
    </div>
  );
}
