'use client';

import { useMemo, useState } from 'react';

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;
export type SortCol<T> = { key: string; label: string; get: (r: T) => string | number | null | undefined };

/** Urutkan baris: klik 1x naik, 2x turun, 3x kembali ke urutan awal. Kosong selalu di bawah. */
export function useSorted<T>(rows: T[], cols: SortCol<T>[]) {
  const [sort, setSort] = useState<SortState>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = cols.find((c) => c.key === sort.key);
    if (!col) return rows;
    const m = sort.dir === 'asc' ? 1 : -1;
    const empty = (v: unknown) => v == null || v === '';
    return [...rows].sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (empty(x) && empty(y)) return 0;
      if (empty(x)) return 1;
      if (empty(y)) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * m;
      return String(x).localeCompare(String(y), undefined, { sensitivity: 'base', numeric: true }) * m;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);
  function toggle(key: string) {
    setSort((s) => (!s || s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));
  }
  return { sorted, sort, toggle };
}

export default function SortHeader({ main, cols, sort, onSort }: {
  main: { key: string; label: string };
  cols: { key: string; label: string }[];
  sort: SortState;
  onSort: (key: string) => void;
}) {
  const btn = (c: { key: string; label: string }) => {
    const active = sort?.key === c.key;
    return (
      <button key={c.key} type="button" className={`sort-th${active ? ' active' : ''}`} onClick={() => onSort(c.key)}
        title={active ? (sort!.dir === 'asc' ? 'Urut naik (klik untuk turun)' : 'Urut turun (klik untuk reset)') : 'Klik untuk mengurutkan'}>
        <span>{c.label}</span>
        <i className="sort-ind">{active ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}</i>
      </button>
    );
  };
  return (
    <div className="sort-header">
      <div className="sort-spacer-av" />
      <div className="sort-main">{btn(main)}</div>
      <div className="sort-meta">{cols.map(btn)}</div>
      <div className="sort-spacer-act" />
    </div>
  );
}
