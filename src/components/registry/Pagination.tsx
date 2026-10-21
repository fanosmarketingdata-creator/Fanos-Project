'use client';

import Select from '@/components/ui/Select';
import { useEffect, useMemo, useState } from 'react';

export const ROWS_OPTIONS = [5, 10, 25, 50, 100];

// Padanan getPagedData() di index.html: default 25 baris/halaman,
// halaman otomatis kembali ke 1 saat hasil pencarian berubah.
export function usePaged<T>(items: T[], resetKey: string, initialRows = 25) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRows);

  useEffect(() => setPage(1), [resetKey, rowsPerPage]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const current = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((current - 1) * rowsPerPage, current * rowsPerPage),
    [items, current, rowsPerPage]
  );

  return { pageItems, total, page: current, totalPages, rowsPerPage, setPage, setRowsPerPage };
}

export default function Pagination({
  total,
  page,
  totalPages,
  rowsPerPage,
  onPage,
  onRows,
}: {
  total: number;
  page: number;
  totalPages: number;
  rowsPerPage: number;
  onPage: (p: number) => void;
  onRows: (n: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, total);
  const info = (
    <div className="pagination-info">
      Menampilkan {total === 0 ? '0' : `${start}-${end}`} dari {total} data
    </div>
  );

  if (totalPages <= 1) return <div className="pagination-container">{info}</div>;

  const maxPages = 5;
  let startPage = Math.max(1, page - Math.floor(maxPages / 2));
  const endPage = Math.min(totalPages, startPage + maxPages - 1);
  if (endPage - startPage < maxPages - 1) startPage = Math.max(1, endPage - maxPages + 1);
  const numbers: number[] = [];
  for (let i = startPage; i <= endPage; i++) numbers.push(i);

  return (
    <div className="pagination-container">
      {info}
      <div className="pagination-controls">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹
        </button>
        <div className="page-numbers">
          {startPage > 1 && (
            <>
              <button type="button" onClick={() => onPage(1)}>1</button>
              {startPage > 2 && <span style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>}
            </>
          )}
          {numbers.map((n) => (
            <button key={n} type="button" className={n === page ? 'active' : ''} onClick={() => onPage(n)}>
              {n}
            </button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>}
              <button type="button" onClick={() => onPage(totalPages)}>{totalPages}</button>
            </>
          )}
        </div>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          ›
        </button>
        <Select className="pagination-rows-select" value={rowsPerPage} onChange={(e) => onRows(Number(e.target.value))}>
          {ROWS_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
