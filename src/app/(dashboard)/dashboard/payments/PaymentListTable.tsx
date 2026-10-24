'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RowActions from '@/components/ui/RowActions';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { DeleteModal } from '@/components/registry/RegistryModal';
import { useToast } from '@/components/Toast';
import { deletePayment } from './actions';

export type PaymentRow = {
  id: string; doc_no: string | null; pay_date: string; amount: number; discount: number;
  method: string | null; reference_no: string | null; invoice_no: string; client_name: string;
};

const rp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

export default function PaymentListTable({ initialRows }: { initialRows: PaymentRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<PaymentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => [r.doc_no, r.client_name, r.invoice_no, r.reference_no, r.method].some((v) => (v || '').toLowerCase().includes(q)));
  }, [initialRows, search]);
  const paged = usePaged(filtered, search);
  const totalReceived = filtered.reduce((s, r) => s + r.amount, 0);
  const totalDiscount = filtered.reduce((s, r) => s + r.discount, 0);

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      const r = await deletePayment(target.id);
      if (r.error) return toast(r.error, 'error');
      toast('Data Payment berhasil dihapus', 'success');
      setTarget(null);
      router.refresh();
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-money-bill-wave" style={{ fontSize: 16, color: '#2563eb' }} /> Payment</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari payment, client, invoice..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Link href="/dashboard/payments/new" className="btn btn-primary">
          <i className="fi fi-rr-plus" /> New Payment
        </Link>
      </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400">Total Diterima</div>
          <div className="mt-1 text-lg font-bold text-emerald-600">{rp(totalReceived)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400">Total Discount</div>
          <div className="mt-1 text-lg font-bold text-amber-600">{rp(totalDiscount)}</div>
        </div>
      </div>

      


      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Jumlah</th>
              <th className="px-4 py-3 font-semibold">Discount</th>
              <th className="px-4 py-3 font-semibold">Metode</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Belum terdapat data pembayaran</td></tr>
            )}
            {paged.pageItems.map((r) => (
              <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; router.push(`/dashboard/payments/${r.id}/view`); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.invoice_no}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(r.pay_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3 font-semibold text-emerald-700">{rp(r.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{rp(r.discount)}</td>
                <td className="px-4 py-3 text-slate-600">{r.method || '-'}</td>
                <td className="px-4 py-3">
                  <RowActions actions={[
                    { label: 'Detail', icon: 'fi fi-rr-eye', href: `/dashboard/payments/${r.id}/view` },
                    { label: 'Cetak', icon: 'fi fi-rr-print', href: `/dashboard/payments/${r.id}/print` },
                    { label: 'Edit', icon: 'fi fi-rr-pencil', href: `/dashboard/payments/${r.id}` },
                    { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setTarget(r) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} />
      </div>

      {target && (
        <DeleteModal title="Konfirmasi Hapus" itemName={target.doc_no || target.client_name} busy={deleting} onConfirm={handleDelete} onClose={() => setTarget(null)} />
      )}
    </div>
  );
}
