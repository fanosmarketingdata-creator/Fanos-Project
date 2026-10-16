'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { generateAkumulasi, updateAkumulasiQty } from '../actions';

export type AkumulasiRow = { id: string; sku: string; qty: number; uom: string | null };

export default function AkumulasiDetailTable({
  boqProjectId,
  initialRows,
}: {
  boqProjectId: string;
  initialRows: AkumulasiRow[];
}) {
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleQtyChange(id: string, qty: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qty } : r)));
  }

  async function handleQtyBlur(id: string, qty: number) {
    setSavingId(id);
    const result = await updateAkumulasiQty(id, qty);
    setSavingId(null);
    if (result.error) toast(result.error, 'error');
  }

  async function handleRefresh() {
    setRefreshing(true);
    const result = await generateAkumulasi(boqProjectId);
    setRefreshing(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Akumulasi di-refresh dari BOQ Project terbaru', 'success');
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/boq-akumulasi" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Kembali ke daftar
        </Link>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100 disabled:opacity-60"
        >
          {refreshing ? 'Memproses...' : '↻ Refresh dari BOQ Project'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Total Qty</th>
              <th className="px-4 py-3 font-semibold">UOM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.sku}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={r.qty}
                    onChange={(e) => handleQtyChange(r.id, parseFloat(e.target.value) || 0)}
                    onBlur={(e) => handleQtyBlur(r.id, parseFloat(e.target.value) || 0)}
                    className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                  />
                  {savingId === r.id && <span className="ml-2 text-[11px] text-slate-400">menyimpan...</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.uom || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Angka qty di atas boleh diubah manual (misal untuk menambah buffer stok). Klik &quot;Refresh dari BOQ
        Project&quot; untuk menghitung ulang dari item BOQ Project terbaru (perubahan manual akan tertimpa).
      </p>
    </div>
  );
}
