'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { generateAkumulasi } from './actions';

export type AkumulasiListRow = {
  id: string;
  project_name: string;
  boq_date: string;
  client_name: string;
  sku_count: number;
};

export default function AkumulasiListTable({ initialRows }: { initialRows: AkumulasiListRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter(
      (r) => r.project_name.toLowerCase().includes(q) || r.client_name.toLowerCase().includes(q)
    );
  }, [initialRows, search]);

  async function handleGenerate(id: string) {
    setGeneratingId(id);
    const result = await generateAkumulasi(id);
    setGeneratingId(null);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Akumulasi berhasil dibuat/diperbarui', 'success');
  }

  return (
    <div>
      <div className="mb-4 w-full max-w-xs">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-search text-[13px]" /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari project / client..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Tanggal BOQ</th>
              <th className="px-4 py-3 font-semibold">Status Akumulasi</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada BOQ Project
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{r.project_name}</td>
                <td className="px-4 py-3 text-slate-600">{r.client_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.boq_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  {r.sku_count > 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                      Sudah · {r.sku_count} SKU
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">
                      Belum
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {r.sku_count > 0 && (
                      <Link
                        href={`/dashboard/boq-akumulasi/${r.id}`}
                        className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        Lihat
                      </Link>
                    )}
                    <button
                      onClick={() => handleGenerate(r.id)}
                      disabled={generatingId === r.id}
                      className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-100 disabled:opacity-60"
                    >
                      {generatingId === r.id ? 'Memproses...' : r.sku_count > 0 ? 'Refresh' : 'Buat Akumulasi'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
