'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export type RowAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

// Kolom aksi tabel: tombol titik tiga yang membuka daftar aksi.
export default function RowActions({ actions }: { actions: RowAction[] }) {
  const items = actions.filter((a) => !a.hidden);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const W = 200;
    const left = Math.max(8, Math.min(window.innerWidth - W - 8, r.right - W));
    const est = items.length * 38 + 12;
    const up = window.innerHeight - r.bottom < est + 12 && r.top > est;
    setPos({ left, ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (pop.current?.contains(t) || btn.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <button
        ref={btn}
        type="button"
        className={`row-actions-btn ${open ? 'is-open' : ''}`}
        aria-label="Aksi"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.9" />
          <circle cx="12" cy="12" r="1.9" />
          <circle cx="12" cy="19" r="1.9" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <div ref={pop} role="menu" className="row-actions-pop" style={{ left: pos.left, top: pos.top, bottom: pos.bottom }}>
            {items.map((a) => {
              const cls = `row-actions-item ${a.danger ? 'danger' : ''}`;
              const inner = (
                <>
                  {a.icon && <i className={a.icon} />}
                  <span>{a.label}</span>
                </>
              );
              return a.href ? (
                <Link key={a.label} href={a.href} role="menuitem" className={cls} onClick={() => setOpen(false)}>
                  {inner}
                </Link>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  role="menuitem"
                  className={cls}
                  disabled={a.disabled}
                  onClick={() => {
                    setOpen(false);
                    a.onClick?.();
                  }}
                >
                  {inner}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
