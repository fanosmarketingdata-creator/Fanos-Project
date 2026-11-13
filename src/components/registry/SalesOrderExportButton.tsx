'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { SO_COLUMNS } from '@/lib/import-columns';
import { getSalesOrdersForExport } from '@/app/(dashboard)/dashboard/sales-orders/actions';

// Export Sales Order ke Excel: satu baris per item, judul kolom sama dengan template Import (bisa diubah lalu di-import kembali).
export default function SalesOrderExportButton({ ids }: { ids: string[] }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await getSalesOrdersForExport(ids);
      if ('error' in res && res.error) { toast(res.error, 'error'); return; }
      const rows = ('rows' in res && res.rows) || [];
      const labels = SO_COLUMNS.map((c) => c.label);
      const XLSX = await import('xlsx');
      const aoa = [labels, ...rows.map((r) => labels.map((l) => r[l] ?? ''))];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = labels.map((l) => ({ wch: Math.min(40, Math.max(l.length + 2, 14)) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Order');
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(wb, `sales-order-${stamp}.xlsx`);
      toast(`${ids.length} Sales Order diekspor (${rows.length} baris)`, 'success');
    } catch (e) {
      toast('Export gagal: ' + (e instanceof Error ? e.message : 'terjadi kendala'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="btn btn-secondary" onClick={run} disabled={busy || ids.length === 0} title={ids.length === 0 ? 'Tidak ada data untuk diekspor' : `Ekspor ${ids.length} Sales Order ke Excel`}>
      <i className="fi fi-rr-download" /> {busy ? 'Memproses...' : 'Export'}
    </button>
  );
}
