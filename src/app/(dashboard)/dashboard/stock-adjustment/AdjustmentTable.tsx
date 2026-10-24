'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RowActions from '@/components/ui/RowActions';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { DeleteModal } from '@/components/registry/RegistryModal';
import { useToast } from '@/components/Toast';
import { deleteAdjustment } from './actions';

export type AdjRow = { id: string; doc_no: string | null; adj_date: string; adj_type: string; reason: string; warehouse: string; item_count: number; net: number };
export const TYPE_LABEL: Record<string, string> = { IN: 'Stock In', OUT: 'Stock Out', OPNAME: 'Koreksi Selisih' };
const TYPE_CLS: Record<string, string> = { IN: 'bg-emerald-100 text-emerald-700', OUT: 'bg-red-100 text-red-700', OPNAME: 'bg-amber-100 text-amber-700' };

export default function AdjustmentTable({ rows }: { rows: AdjRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<AdjRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => [r.doc_no, r.reason, r.warehouse].some((v) => (v || '').toLowerCase().includes(q))) : rows;
  }, [rows, search]);
  const paged = usePaged(filtered, search);

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      const r = await deleteAdjustment(target.id);
      if (r.error) return toast(r.error, 'error');
      toast('Data Stock Adjustment berhasil dihapus', 'success');
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
        <h3><i className="fi fi-rr-edit" style={{ fontSize: 16, color: '#2563eb' }} /> Stock Adjustment</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari dokumen, alasan, gudang..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Link href="/dashboard/stock-adjustment/new" className="btn btn-primary"><i className="fi fi-rr-plus" /> New Adjustment</Link>
      </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Tipe</th>
              <th className="px-4 py-3 font-semibold">Gudang</th>
              <th className="px-4 py-3 font-semibold">Alasan / Kategori</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Efek Stok</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Belum terdapat data stock adjustment</td></tr>}
            {paged.pageItems.map((r) => (
              <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; router.push(`/dashboard/stock-adjustment/${r.id}/view`); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(r.adj_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${TYPE_CLS[r.adj_type] || ''}`}>{TYPE_LABEL[r.adj_type] ?? r.adj_type}</span></td>
                <td className="px-4 py-3 text-slate-600">{r.warehouse}</td>
                <td className="px-4 py-3 text-slate-600">{r.reason}</td>
                <td className="px-4 py-3 text-slate-600">{r.item_count}</td>
                <td className={`px-4 py-3 font-semibold ${r.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{r.net > 0 ? '+' : ''}{r.net}</td>
                <td className="px-4 py-3">
                  <RowActions actions={[
                    { label: 'Detail', icon: 'fi fi-rr-eye', href: `/dashboard/stock-adjustment/${r.id}/view` },
                    { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setTarget(r) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} /></div>
      {target && <DeleteModal title="Konfirmasi Hapus" itemName={target.doc_no || target.reason} busy={deleting} onConfirm={handleDelete} onClose={() => setTarget(null)} />}
    </div>
  );
}
