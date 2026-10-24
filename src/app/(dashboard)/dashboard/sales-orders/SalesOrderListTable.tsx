'use client';

import RowActions from '@/components/ui/RowActions';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { deleteSalesOrder, changeSalesOrderStatus } from './actions';

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
  VERIFIED: 'bg-blue-100 text-blue-700',
  ONGOING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function SalesOrderListTable({ initialRows }: { initialRows: SalesOrderRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SalesOrderRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    toast('Data Sales Order berhasil dihapus', 'success');
    setDeleteTarget(null);
  }

  async function handleStatus(r: SalesOrderRow, to: 'VERIFIED' | 'COMPLETED') {
    const label = to === 'VERIFIED' ? 'Verified' : 'Completed';
    if (!window.confirm(`Tandai Sales Order ${r.doc_no ?? r.client_name} sebagai ${label}?`)) return;
    setBusyId(r.id);
    try {
      const res = await changeSalesOrderStatus(r.id, to);
      if (res.error) return toast(res.error, 'error');
      toast(`Sales Order ditandai ${label}`, 'success');
      router.refresh();
    } catch (e) {
      toast('Status gagal diubah: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-shopping-cart" style={{ fontSize: 16, color: '#2563eb' }} /> Sales Orders</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari client..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Link
          href="/dashboard/sales-orders/new"
          className="btn btn-primary"
        >
          <i className="fi fi-rr-plus" /> Tambah Sales Order
        </Link>
      </div>
      </div>
      

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
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
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Belum terdapat data Sales Order
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; router.push(`/dashboard/sales-orders/${r.id}/view`); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
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
                  <RowActions
                    actions={[
                { label: 'Cetak', icon: 'fi fi-rr-print', href: `/dashboard/sales-orders/${r.id}/print` },
                { label: 'Mark as Verified', icon: 'fi fi-rr-badge-check', onClick: () => handleStatus(r, 'VERIFIED'), disabled: busyId === r.id, hidden: r.status !== 'DRAFT' },
                { label: 'Mark as Completed', icon: 'fi fi-rr-check', onClick: () => handleStatus(r, 'COMPLETED'), disabled: busyId === r.id, hidden: r.status !== 'VERIFIED' },
                { label: 'Edit', icon: 'fi fi-rr-pencil', href: `/dashboard/sales-orders/${r.id}`, hidden: r.status !== 'DRAFT' },
                { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setDeleteTarget(r), hidden: r.status === 'COMPLETED' },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            Apakah Anda yakin ingin menghapus Sales Order untuk <strong>{deleteTarget.client_name}</strong>? Delivery Order
            terkait akan turut terhapus.
          </p>
        </Modal>
      )}
    </div>
  );
}
