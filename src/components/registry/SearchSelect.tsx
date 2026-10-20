'use client';

import { useMemo, useState } from 'react';

export type SearchOption = { value: string; label: string; sub?: string };

// Dropdown dengan pencarian (fv2-select-search di index.html).
export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Cari...',
  disabled,
}: {
  value: string;
  onChange: (value: string, option: SearchOption) => void;
  options: SearchOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => (o.label + ' ' + (o.sub || '')).toLowerCase().includes(q)) : options;
    return list.slice(0, 50);
  }, [options, query]);

  return (
    <div className="fv2-select-search">
      <input
        value={open ? query : selected?.label ?? ''}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      <i className="fi fi-rr-angle-down arrow" />
      {open && (
        <div className="fv2-select-dropdown">
          {results.length === 0 && <div className="empty">Tidak ditemukan</div>}
          {results.map((o) => (
            <button
              key={o.value}
              type="button"
              className="opt"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o.value, o);
                setOpen(false);
              }}
            >
              {o.label}
              {o.sub && <span className="sub">{o.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
