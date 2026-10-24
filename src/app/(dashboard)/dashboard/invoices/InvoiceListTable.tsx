'use client';

import RowActions from '@/components/ui/RowActions';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { deleteInvoice } from './actions';

export type InvoiceRow = {
  id: string;
  doc_no: string | null;
  inv_date: string;
  status: string;
  grand_total: number;
  total_paid: number;
  remaining: number;
  client_name: string;
};

const statusBadge: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

export default function InvoiceListTable({ initialRows }: { initialRows: InvoiceRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => r.client_name.toLowerCase().includes(q));
  }, [initialRows, search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteInvoice(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Data Invoice berhasil dihapus', 'success');
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-receipt" style={{ fontSize: 16, color: '#2563eb' }} /> Invoices</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari client..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Link
          href="/dashboard/invoices/new"
          className="btn btn-primary"
        >
          <i className="fi fi-rr-plus" /> Buat Invoice
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
              <th className="px-4 py-3 font-semibold">Grand Total</th>
              <th className="px-4 py-3 font-semibold">Terbayar</th>
              <th className="px-4 py-3 font-semibold">Sisa</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  Belum terdapat data invoice
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; router.push(`/dashboard/invoices/${r.id}`); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.inv_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">Rp {r.grand_total.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-slate-600">Rp {r.total_paid.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-slate-600">Rp {r.remaining.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge[r.status] || 'bg-slate-100 text-slate-600'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    actions={[
                { label: 'Cetak', icon: 'fi fi-rr-print', href: `/dashboard/invoices/${r.id}/print` },
                { label: 'Detail', icon: 'fi fi-rr-eye', href: `/dashboard/invoices/${r.id}` },
                { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setDeleteTarget(r), hidden: r.status !== 'UNPAID' },
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
          title="Hapus Invoice"
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
            Apakah Anda yakin ingin menghapus invoice untuk <strong>{deleteTarget.client_name}</strong>?
          </p>
        </Modal>
      )}
    </div>
  );
}
