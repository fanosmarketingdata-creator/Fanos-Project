'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SearchOption } from './SearchSelect';

// Pemilih dokumen sumber (Quotation, Sales Order, Invoice, PO, dst.) dalam bentuk pop up.
// API sama dengan SearchSelect supaya mudah dipertukarkan.
export default function DocPicker({
  value,
  onChange,
  options,
  placeholder = 'Cari...',
  disabled,
  title,
  clearable,
}: {
  value: string;
  onChange: (value: string, option: SearchOption) => void;
  options: SearchOption[];
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.value === value);
  const heading = title ?? (/^Cari /i.test(placeholder) ? 'Pilih ' + placeholder.replace(/^Cari\s+/i, '').replace(/\.{3}$/, '') : 'Pilih data');

  useEffect(() => {
    if (!open) return;
    setQ('');
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onKey, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey, true); document.body.style.overflow = prev; };
  }, [open]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(s)) : options;
  }, [q, options]);

  function pick(o: SearchOption) {
    if (o.disabled) return;
    onChange(o.value, o);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={`dp-trigger${selected ? ' has' : ''}`} disabled={disabled} onClick={() => setOpen(true)}>
        <span className="dp-trigger-text">
          {selected ? (
            <>
              <span className="dp-trigger-main">{selected.label}</span>
              {selected.sub && <span className="dp-trigger-sub">{selected.sub}</span>}
            </>
          ) : (
            <span className="dp-trigger-ph">{placeholder}</span>
          )}
        </span>
        <i className="fi fi-rr-search" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="dp-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="dp-modal" role="dialog" aria-modal="true">
            <div className="dp-head">
              <strong>{heading}</strong>
              <button type="button" className="dp-x" onClick={() => setOpen(false)} aria-label="Tutup"><i className="fi fi-rr-cross-small" /></button>
            </div>
            <div className="dp-search">
              <i className="fi fi-rr-search" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
            </div>
            <div className="dp-list">
              {clearable && value && (
                <button type="button" className="dp-row dp-clear" onClick={() => { onChange('', { value: '', label: '' }); setOpen(false); }}>
                  <span className="dp-row-main">Kosongkan pilihan</span>
                </button>
              )}
              {list.length === 0 ? (
                <div className="dp-empty">Tidak ada data yang cocok</div>
              ) : (
                list.map((o) => (
                  <button type="button" key={o.value} disabled={o.disabled} className={`dp-row${o.value === value ? ' on' : ''}`} onClick={() => pick(o)}>
                    <span className="dp-row-main">{o.label}</span>
                    {o.sub && <span className="dp-row-sub">{o.sub}</span>}
                    {o.value === value && <i className="fi fi-rr-check dp-tick" />}
                  </button>
                ))
              )}
            </div>
            <div className="dp-foot">{list.length} data</div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
