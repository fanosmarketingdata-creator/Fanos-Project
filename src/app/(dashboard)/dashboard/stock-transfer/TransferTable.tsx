'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RowActions from '@/components/ui/RowActions';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { DeleteModal } from '@/components/registry/RegistryModal';
import { useToast } from '@/components/Toast';
import { deleteTransfer, receiveTransfer, shipTransfer } from './actions';

export type TrfRow = { id: string; doc_no: string | null; transfer_date: string; received_date: string | null; status: string; from: string; to: string; item_count: number; total_qty: number };
export const STATUS_LABEL: Record<string, string> = { DRAFT: 'Draft', SHIPPED: 'Shipped', COMPLETED: 'Completed' };
export const STATUS_CLS: Record<string, string> = { DRAFT: 'bg-slate-100 text-slate-600', SHIPPED: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700' };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export default function TransferTable({ rows }: { rows: TrfRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [target, setTarget] = useState<TrfRow | null>(null);
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!status || r.status === status) && (!q || [r.doc_no, r.from, r.to].some((v) => (v || '').toLowerCase().includes(q))));
  }, [rows, search, status]);
  const paged = usePaged(filtered, search + status);

  async function run(fn: () => Promise<{ error?: string }>, ok: string) {
    setBusy(true);
    try {
      const r = await fn();
      if (r.error) return toast(r.error, 'error');
      toast(ok, 'success');
      setTarget(null);
      router.refresh();
    } catch (e) {
      toast('Proses gagal: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-exchange" style={{ fontSize: 16, color: '#2563eb' }} /> Stock Transfer</h3>
        <div className="flex-wrap">
        <>
          <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari dokumen, gudang..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
            <option value="">Semua Status</option>
            <option value="DRAFT">Draft</option><option value="SHIPPED">Shipped</option><option value="COMPLETED">Completed</option>
          </select>
        </>
        <Link href="/dashboard/stock-transfer/new" className="btn btn-primary"><i className="fi fi-rr-plus" /> New Transfer</Link>
      </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Gudang Asal</th>
              <th className="px-4 py-3 font-semibold">Gudang Tujuan</th>
              <th className="px-4 py-3 font-semibold">Tgl Kirim</th>
              <th className="px-4 py-3 font-semibold">Tgl Terima</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Belum terdapat data stock transfer</td></tr>}
            {paged.pageItems.map((r) => (
              <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; router.push(`/dashboard/stock-transfer/${r.id}/view`); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.from}</td>
                <td className="px-4 py-3 text-slate-600">{r.to}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(r.transfer_date)}</td>
                <td className="px-4 py-3 text-slate-600">{fmt(r.received_date)}</td>
                <td className="px-4 py-3 text-slate-600">{r.item_count} ({r.total_qty})</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_CLS[r.status] || ''}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                <td className="px-4 py-3">
                  <RowActions actions={[
                    { label: 'Detail', icon: 'fi fi-rr-eye', href: `/dashboard/stock-transfer/${r.id}/view` },
                    ...(r.status === 'DRAFT' ? [{ label: 'Kirim (Transfer Out)', icon: 'fi fi-rr-paper-plane', onClick: () => run(() => shipTransfer(r.id), 'Transfer dikirim. Stok gudang asal berkurang (In-Transit)') }] : []),
                    ...(r.status === 'SHIPPED' ? [{ label: 'Terima (Transfer In)', icon: 'fi fi-rr-check', onClick: () => run(() => receiveTransfer(r.id), 'Transfer diterima. Stok gudang tujuan bertambah') }] : []),
                    ...(r.status === 'DRAFT' ? [{ label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setTarget(r) }] : []),
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} /></div>
      {target && <DeleteModal title="Konfirmasi Hapus" itemName={target.doc_no || 'Transfer'} busy={busy} onConfirm={() => run(() => deleteTransfer(target.id), 'Data Stock Transfer berhasil dihapus')} onClose={() => setTarget(null)} />}
    </div>
  );
}
