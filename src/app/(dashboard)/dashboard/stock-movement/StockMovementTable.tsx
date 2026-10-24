'use client';

import { useMemo, useState } from 'react';
import Select from '@/components/ui/Select';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { REF_LABEL } from '@/lib/stock';

type Row = { id: string; date: string; sku: string; name: string; qty: number; ref_type: string; ref_no: string; warehouse: string; reason: string; notes: string };

export default function StockMovementTable({ rows, warehouses }: { rows: Row[]; warehouses: { id: string; name: string }[] }) {
  const [search, setSearch] = useState('');
  const [wh, setWh] = useState('');
  const [type, setType] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!wh || r.warehouse === wh) && (!type || r.ref_type === type) && (!q || [r.sku, r.name, r.ref_no, r.reason, r.notes].some((v) => (v || '').toLowerCase().includes(q))));
  }, [rows, search, wh, type]);
  const paged = usePaged(filtered, search + wh + type);
  const totalIn = filtered.filter((r) => r.qty > 0).reduce((s, r) => s + r.qty, 0);
  const totalOut = filtered.filter((r) => r.qty < 0).reduce((s, r) => s + -r.qty, 0);

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-arrows-repeat" style={{ fontSize: 16, color: '#2563eb' }} /> Stock Movement</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari SKU, produk, no dokumen, alasan..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div style={{ minWidth: 190 }}>
          <Select value={wh} onChange={(e) => setWh(e.target.value)}>
            <option value="">Semua Gudang</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
        <div style={{ minWidth: 190 }}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Semua Tipe Dokumen</option>
            {Object.entries(REF_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold text-slate-400">Total Masuk</div><div className="mt-1 text-lg font-bold text-emerald-600">{totalIn}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold text-slate-400">Total Keluar</div><div className="mt-1 text-lg font-bold text-red-600">{totalOut}</div></div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Tipe Dokumen</th>
              <th className="px-4 py-3 font-semibold">No. Dokumen</th>
              <th className="px-4 py-3 font-semibold">Gudang</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Nama Produk</th>
              <th className="px-4 py-3 font-semibold">Masuk</th>
              <th className="px-4 py-3 font-semibold">Keluar</th>
              <th className="px-4 py-3 font-semibold">Alasan / Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Belum terdapat pergerakan stok</td></tr>}
            {paged.pageItems.map((m) => (
              <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{new Date(m.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{REF_LABEL[m.ref_type] ?? m.ref_type}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{m.ref_no || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{m.warehouse}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">{m.sku}</td>
                <td className="px-4 py-3 text-slate-600">{m.name || '-'}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600">{m.qty > 0 ? `+${m.qty}` : ''}</td>
                <td className="px-4 py-3 font-semibold text-red-600">{m.qty < 0 ? m.qty : ''}</td>
                <td className="px-4 py-3 text-slate-500">{[m.reason, m.notes].filter(Boolean).join(' — ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} /></div>
    </div>
  );
}
