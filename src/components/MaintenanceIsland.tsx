'use client';

import { useEffect, useState } from 'react';

type Tone = 'info' | 'danger';

// "Dynamic island": pill hitam kecil yang melebar jadi kartu. Dipakai di halaman maintenance (otomatis terbuka)
// dan sebagai peringatan di dashboard (klik untuk membuka/menutup).
export default function MaintenanceIsland({
  variant, title, subtitle, message, eta, scheduledAt, tone = 'info', children,
}: {
  variant: 'page' | 'notice';
  title: string;
  subtitle?: string;
  message?: string;
  eta?: string;
  scheduledAt?: string;
  tone?: Tone;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (variant !== 'page') return;
    const t = setTimeout(() => setOpen(true), 650);
    return () => clearTimeout(t);
  }, [variant]);

  const when = scheduledAt ? new Date(scheduledAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB' : '';

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
          {message && <p className="mi-msg">{message}</p>}
          {when && <p className="mi-eta">Jadwal: <b data-no-i18n>{when}</b></p>}
          {eta && <p className="mi-eta">Perkiraan selesai: <b data-no-i18n>{eta}</b></p>}
          {children}
        </div></div>
      </div>
    </div>
  );
}
