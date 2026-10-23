'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RowActions from '@/components/ui/RowActions';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { DeleteModal } from '@/components/registry/RegistryModal';
import StatusBadge from '@/components/registry/StatusBadge';
import { useToast } from '@/components/Toast';
import { deletePurchaseInvoice } from './actions';

export type PIRow = { id: string; doc_no: string | null; inv_date: string; due_date: string | null; vendor_invoice_no: string | null; status: string; grand_total: number; total_paid: number; remaining: number; vendor: string; po_no: string };
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export default function InvoiceTable({ rows }: { rows: PIRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [target, setTarget] = useState<PIRow | null>(null);
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!status || r.status === status) && (!q || [r.doc_no, r.vendor, r.po_no, r.vendor_invoice_no].some((v) => (v || '').toLowerCase().includes(q))));
  }, [rows, search, status]);
  const paged = usePaged(filtered, search + status);
  const totalDebt = rows.reduce((s, r) => s + r.remaining, 0);
  const today = new Date().toISOString().split('T')[0];

  async function handleDelete() {
    if (!target) return;
    setBusy(true);
    try {
      const r = await deletePurchaseInvoice(target.id);
      if (r.error) return toast(r.error, 'error');
      toast('Data Purchase Invoice berhasil dihapus', 'success');
      setTarget(null);
      router.refresh();
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"><span className="text-slate-500">Total Utang ke Vendor (Outstanding): </span><b className="text-red-600">{rp(totalDebt)}</b></div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-search text-[13px]" /></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari invoice, vendor, PO..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
            <option value="">Semua Status</option><option value="UNPAID">UNPAID</option><option value="PARTIAL">PARTIAL</option><option value="PAID">PAID</option>
          </select>
        </div>
        <Link href="/dashboard/purchase-invoice/new" className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600">+ New Purchase Invoice</Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th><th className="px-4 py-3 font-semibold">Vendor</th><th className="px-4 py-3 font-semibold">PO</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th><th className="px-4 py-3 font-semibold">Jatuh Tempo</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th><th className="px-4 py-3 text-right font-semibold">Sudah Dibayar</th><th className="px-4 py-3 text-right font-semibold">Sisa</th>
              <th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Belum terdapat data purchase invoice</td></tr>}
            {paged.pageItems.map((r) => {
              const overdue = r.status !== 'PAID' && r.due_date && r.due_date < today;
              return (
                <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; router.push(`/dashboard/purchase-invoice/${r.id}/view`); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.vendor}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.po_no}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(r.inv_date)}</td>
                  <td className={`px-4 py-3 ${overdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>{fmt(r.due_date)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{rp(r.grand_total)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{rp(r.total_paid)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{rp(r.remaining)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <RowActions actions={[
                      { label: 'Detail', icon: 'fi fi-rr-eye', href: `/dashboard/purchase-invoice/${r.id}/view` },
                      { label: 'Bayar', icon: 'fi fi-rr-wallet', href: `/dashboard/purchase-payment/new?invoice=${r.id}`, hidden: r.status === 'PAID' },
                      { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setTarget(r) },
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} /></div>
      {target && <DeleteModal title="Konfirmasi Hapus" itemName={target.doc_no || 'Purchase Invoice'} busy={busy} onConfirm={handleDelete} onClose={() => setTarget(null)} />}
    </div>
  );
}
