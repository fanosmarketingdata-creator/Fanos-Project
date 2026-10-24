'use client';

import { useMemo, useState } from 'react';
import Select from '@/components/ui/Select';
import Pagination, { usePaged } from '@/components/registry/Pagination';

type P = { sku: string; name: string; brand: string | null; uom: string; category: string | null };

export default function CurrentStockTable({ warehouses, products, onHand, inTransit }: {
  warehouses: { id: string; name: string }[]; products: P[]; onHand: Record<string, Record<string, number>>; inTransit: Record<string, number>;
}) {
  const [wh, setWh] = useState('');
  const [search, setSearch] = useState('');
  const [onlyStock, setOnlyStock] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .map((p) => {
        const per = onHand[p.sku] ?? {};
        const qty = wh ? per[wh] ?? 0 : Object.values(per).reduce((s, n) => s + n, 0);
        return { ...p, qty, transit: inTransit[p.sku] ?? 0 };
      })
      .filter((r) => (!q || [r.sku, r.name, r.brand].some((v) => (v || '').toLowerCase().includes(q))) && (!onlyStock || r.qty !== 0 || r.transit > 0));
  }, [products, onHand, inTransit, wh, search, onlyStock]);
  const paged = usePaged(rows, search + wh + onlyStock);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalTransit = rows.reduce((s, r) => s + r.transit, 0);

  return (
    <div>
      <div className="card-header">
        <h3><i className="fa-solid fa-cubes" style={{ fontSize: 16, color: '#2563eb' }} /> Current Stock</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari SKU, produk, brand..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div style={{ minWidth: 200 }}>
          <Select value={wh} onChange={(e) => setWh(e.target.value)}>
            <option value="">Semua Gudang</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-slate-600"><input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} /> Hanya yang ada stok</label>
      </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold text-slate-400">Total Stok (On Hand)</div><div className="mt-1 text-lg font-bold text-slate-800">{totalQty}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold text-slate-400">Dalam Perjalanan (In Transit)</div><div className="mt-1 text-lg font-bold text-amber-600">{totalTransit}</div></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold text-slate-400">Jumlah SKU</div><div className="mt-1 text-lg font-bold text-slate-800">{rows.length}</div></div>
      </div>

      

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Nama Produk</th>
              <th className="px-4 py-3 font-semibold">Brand</th>
              <th className="px-4 py-3 font-semibold">Satuan</th>
              <th className="px-4 py-3 font-semibold">Stok</th>
              <th className="px-4 py-3 font-semibold">In Transit</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum terdapat data stok</td></tr>}
            {paged.pageItems.map((r) => (
              <tr key={r.sku} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.sku}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.brand || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.uom || '-'}</td>
                <td className={`px-4 py-3 font-semibold ${r.qty < 0 ? 'text-red-600' : r.qty === 0 ? 'text-slate-400' : 'text-emerald-700'}`}>{r.qty}</td>
                <td className="px-4 py-3 text-amber-600">{r.transit || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} /></div>
    </div>
  );
}
