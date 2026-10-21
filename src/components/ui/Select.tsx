'use client';

import { Children, isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Item = { value: string; label: string; disabled?: boolean; group?: string };

// Ubah <option>/<optgroup> menjadi daftar item datar, supaya <select> lama bisa diganti tanpa ubah isinya.
function parseChildren(children: ReactNode, group?: string, out: Item[] = []): Item[] {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const p = c.props as { value?: string | number; disabled?: boolean; label?: string; children?: ReactNode };
    if (c.type === 'optgroup') parseChildren(p.children, p.label, out);
    else if (c.type === 'option') {
      const text = Children.toArray(p.children).join('');
      out.push({ value: String(p.value ?? text), label: text, disabled: p.disabled, group });
    } else if (p.children) parseChildren(p.children, group, out);
  });
  return out;
}

export type UiSelectProps = {
  value: string | number;
  onChange: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

// Dropdown modern pengganti <select> bawaan browser: popover berbayang, centang pada pilihan,
// pencarian otomatis bila pilihan banyak, navigasi keyboard, dan membuka ke atas bila ruang bawah sempit.
export default function Select({ value, onChange, disabled, className = '', style, children }: UiSelectProps) {
  const items = useMemo(() => parseChildren(children), [children]);
  const current = String(value ?? '');
  const selected = items.find((i) => i.value === current);
  const placeholderItem = items.find((i) => i.value === '');
  const searchable = items.length > 8;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.value !== '' && (!q || i.label.toLowerCase().includes(q)));
  }, [items, query]);
  // Pilihan kosong ("— Pilih salah satu —") tampil di atas sebagai opsi "kosongkan".
  const rows: Item[] = useMemo(() => (placeholderItem && !query.trim() ? [placeholderItem, ...visible] : visible), [placeholderItem, visible, query]);

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    const maxH = Math.max(140, Math.min(300, up ? above : below));
    setPos({ left: r.left, width: Math.max(r.width, 180), maxH, ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
  }

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation(); // jangan ikut menutup modal di bawahnya
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  // Sorot pilihan aktif saat dibuka dan gulir ke sana.
  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, rows.findIndex((r) => r.value === current));
    setHi(idx);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  function choose(i: Item) {
    if (i.disabled) return;
    onChange({ target: { value: i.value } });
    setOpen(false);
    setQuery('');
    btnRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(rows.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[hi]) choose(rows[hi]); }
    else if (e.key === 'Tab') setOpen(false);
  }

  const showPlaceholder = !selected || selected.value === '';
  const label = selected && selected.value !== '' ? selected.label : placeholderItem?.label ?? '';

  let lastGroup: string | undefined;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`ui-select-trigger ${open ? 'is-open' : ''} ${className}`}
        style={style}
        onClick={() => { setQuery(''); setOpen((o) => !o); }}
        onKeyDown={onKeyDown}
      >
        <span className={`ui-select-label ${showPlaceholder ? 'is-placeholder' : ''}`}>{label}</span>
        <svg className="ui-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && pos && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popRef}
            className="ui-select-pop"
            role="listbox"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            onKeyDown={onKeyDown}
          >
            {searchable && (
              <div className="ui-select-search">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setHi(0); }} placeholder="Cari..." />
              </div>
            )}
            <div ref={listRef} className="ui-select-list" style={{ maxHeight: pos.maxH - (searchable ? 48 : 0) }}>
              {rows.length === 0 && <div className="ui-select-empty">Tidak ditemukan</div>}
              {rows.map((r, idx) => {
                const header = r.group && r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                const isSel = r.value === current;
                return (
                  <div key={r.value + idx}>
                    {header && <div className="ui-select-group">{header}</div>}
                    <button
                      type="button"
                      data-i={idx}
                      role="option"
                      aria-selected={isSel}
                      disabled={r.disabled}
                      className={`ui-select-opt ${isSel ? 'is-selected' : ''} ${hi === idx ? 'is-hi' : ''} ${r.value === '' ? 'is-empty' : ''}`}
                      onMouseEnter={() => setHi(idx)}
                      onClick={() => choose(r)}
                    >
                      <span>{r.label}</span>
                      {isSel && r.value !== '' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
