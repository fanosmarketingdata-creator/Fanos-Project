'use client';

import { useState } from 'react';

export type ExportColumn<T> = { label: string; get: (row: T) => string | number | boolean | null | undefined };

// Tombol Export ke Excel. Mengekspor SEMUA baris yang sedang tampil sesuai pencarian/filter (bukan hanya halaman aktif).
export default function ExportButton<T>({ rows, columns, fileName, sheetName }: { rows: T[]; columns: ExportColumn<T>[]; fileName: string; sheetName: string }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const XLSX = await import('xlsx');
      const aoa: (string | number)[][] = [columns.map((c) => c.label)];
      for (const r of rows) {
        aoa.push(
          columns.map((c) => {
            const v = c.get(r);
            if (v === null || v === undefined) return '';
            if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
            return v;
          })
        );
      }
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = columns.map((c, i) => ({ wch: Math.min(40, Math.max(c.label.length + 2, ...aoa.slice(1, 60).map((row) => String(row[i] ?? '').length + 2))) }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 } as never;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(wb, `${fileName}-${stamp}.xlsx`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn btn-secondary" onClick={run} disabled={busy || rows.length === 0} title={rows.length === 0 ? 'Tidak ada data untuk diekspor' : `Ekspor ${rows.length} data ke Excel`}>
      <i className="fi fi-rr-download" /> {busy ? 'Memproses...' : 'Export'}
    </button>
  );
}
