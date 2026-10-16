'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { deletePurchaseOrder, advancePOStatus } from './actions';

export type PORow = {
  id: string;
  doc_no: string | null;
  po_date: string;
  status: string;
  vendor_name: string;
  total: number;
};

const statusBadge: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ORDERED: 'bg-blue-100 text-blue-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
};

export default function POListTable({ initialRows }: { initialRows: PORow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PORow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => r.vendor_name.toLowerCase().includes(q));
  }, [initialRows, search]);

  async function handleAdvance(row: PORow) {
    setAdvancingId(row.id);
    const result = await advancePOStatus(row.id);
    setAdvancingId(null);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(result.status === 'ORDERED' ? 'PO ditandai sudah di-order' : 'PO ditandai sudah diterima', 'success');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deletePurchaseOrder(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('PO dihapus', 'success');
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-search text-[13px]" /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari vendor..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
        <Link
          href="/dashboard/purchase-orders/new"
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Buat PO
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Vendor</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada Purchase Order
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.vendor_name}
                  {r.doc_no && <div className="font-mono text-[10px] font-normal text-slate-400">{r.doc_no}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.po_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">Rp {r.total.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge[r.status] || 'bg-slate-100 text-slate-600'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/dashboard/purchase-orders/${r.id}/print`}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      Cetak
                    </Link>
                    {r.status === 'DRAFT' && (
                      <>
                        <Link
                          href={`/dashboard/purchase-orders/${r.id}`}
                          className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleAdvance(r)}
                          disabled={advancingId === r.id}
                          className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-60"
                        >
                          Order ke Vendor
                        </button>
                      </>
                    )}
                    {r.status === 'ORDERED' && (
                      <button
                        onClick={() => handleAdvance(r)}
                        disabled={advancingId === r.id}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Tandai Diterima
                      </button>
                    )}
                    {r.status !== 'RECEIVED' && (
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <Modal
          title="Hapus Purchase Order"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Yakin ingin menghapus PO ke <strong>{deleteTarget.vendor_name}</strong>?
          </p>
        </Modal>
      )}
    </div>
  );
}
