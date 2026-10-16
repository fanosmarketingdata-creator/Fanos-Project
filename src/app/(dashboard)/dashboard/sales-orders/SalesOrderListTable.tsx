'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import ShipItemsModal from './ShipItemsModal';
import { deleteSalesOrder } from './actions';

export type SalesOrderRow = {
  id: string;
  doc_no: string | null;
  so_date: string;
  status: string;
  total_amount: number;
  client_name: string;
};

const statusBadge: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ONGOING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function SalesOrderListTable({ initialRows }: { initialRows: SalesOrderRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SalesOrderRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shipTargetId, setShipTargetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => r.client_name.toLowerCase().includes(q));
  }, [initialRows, search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteSalesOrder(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Sales Order dihapus', 'success');
    setDeleteTarget(null);
  }

  function handleShipClose(didShip: boolean) {
    setShipTargetId(null);
    if (didShip) window.location.reload();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari client..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
        <Link
          href="/dashboard/sales-orders/new"
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Tambah Sales Order
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Client</th>
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
                  Belum ada Sales Order
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.client_name}
                  {r.doc_no && <div className="font-mono text-[10px] font-normal text-slate-400">{r.doc_no}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.so_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">Rp {r.total_amount.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge[r.status] || 'bg-slate-100 text-slate-600'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/dashboard/sales-orders/${r.id}/print`}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                    >
                      Cetak
                    </Link>
                    {r.status !== 'COMPLETED' && r.status !== 'CANCELLED' && (
                      <button
                        onClick={() => setShipTargetId(r.id)}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                      >
                        Ship Items
                      </button>
                    )}
                    {r.status === 'DRAFT' && (
                      <Link
                        href={`/dashboard/sales-orders/${r.id}`}
                        className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                      >
                        Edit
                      </Link>
                    )}
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shipTargetId && <ShipItemsModal soId={shipTargetId} onClose={handleShipClose} />}

      {deleteTarget && (
        <Modal
          title="Hapus Sales Order"
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
            Yakin ingin menghapus Sales Order untuk <strong>{deleteTarget.client_name}</strong>? Delivery Order
            terkait akan ikut terhapus.
          </p>
        </Modal>
      )}
    </div>
  );
}
