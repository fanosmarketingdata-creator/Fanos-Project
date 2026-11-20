'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLang } from '@/components/I18nProvider';

const OPTS = [
  { v: 'Pending', en: 'Pending', id: 'Tertunda', fg: '#b45309', bg: 'rgba(245, 158, 11, .16)' },
  { v: 'InProgress', en: 'In Progress', id: 'Sedang Berjalan', fg: '#2563eb', bg: 'rgba(59, 130, 246, .16)' },
  { v: 'Completed', en: 'Completed', id: 'Selesai', fg: '#15803d', bg: 'rgba(34, 197, 94, .16)' },
] as const;

/** Chip status yang bisa diklik untuk mengganti nilainya langsung di tabel. */
export default function ProgressChip({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const cur = OPTS.find((o) => o.v === value) || OPTS[0];
  const label = (o: (typeof OPTS)[number]) => (lang === 'id' ? o.id : o.en);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', key);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); document.removeEventListener('keydown', key); };
  }, [open]);

  function toggle() {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const h = 3 * 34 + 12;
    setPos({ top: r.bottom + h > window.innerHeight ? r.top - h - 4 : r.bottom + 4, left: Math.min(r.left, window.innerWidth - 168) });
    setOpen((o) => !o);
  }

  return (
    <>
      <button ref={btn} type="button" disabled={disabled} onClick={toggle} className="pg-chip" style={{ color: cur.fg, background: cur.bg }}>
        <span className="pg-dot" style={{ background: cur.fg }} />
        {label(cur)}
        <i className="fi fi-rr-angle-small-down" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="pg-overlay" onMouseDown={() => setOpen(false)}>
          <div className="pg-menu" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.stopPropagation()}>
            {OPTS.map((o) => (
              <button key={o.v} type="button" className={`pg-item${o.v === cur.v ? ' is-on' : ''}`} onClick={() => { setOpen(false); if (o.v !== cur.v) onChange(o.v); }}>
                <span className="pg-dot" style={{ background: o.fg }} />
                {label(o)}
                {o.v === cur.v && <i className="fi fi-rr-check" />}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
