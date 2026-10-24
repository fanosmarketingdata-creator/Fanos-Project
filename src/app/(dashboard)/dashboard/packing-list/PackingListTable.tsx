'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RowActions from '@/components/ui/RowActions';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { DeleteModal } from '@/components/registry/RegistryModal';
import { useToast } from '@/components/Toast';
import { deletePackingList } from './actions';

export type PLRow = { id: string; doc_no: string | null; pl_date: string; status: string; client_name: string; so_no: string; qty: number; colli: number; weight: number };

export default function PackingListTable({ rows }: { rows: PLRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<PLRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => [r.doc_no, r.client_name, r.so_no].some((v) => (v || '').toLowerCase().includes(q))) : rows;
  }, [rows, search]);
  const paged = usePaged(filtered, search);

  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      const r = await deletePackingList(target.id);
      if (r.error) return toast(r.error, 'error');
      toast('Data Packing List berhasil dihapus', 'success');
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
        <h3><i className="fi fi-rr-box-open" style={{ fontSize: 16, color: '#2563eb' }} /> Packing List</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari packing list, client, SO..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Link href="/dashboard/packing-list/new" className="btn btn-primary"><i className="fi fi-rr-plus" /> New Packing List</Link>
      </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Sales Order</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Total Qty</th>
              <th className="px-4 py-3 font-semibold">Jumlah Kemasan</th>
              <th className="px-4 py-3 font-semibold">Berat Kotor (Kg)</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Belum terdapat data packing list</td></tr>}
            {paged.pageItems.map((r) => (
              <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; router.push(`/dashboard/packing-list/${r.id}/view`); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.so_no}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(r.pl_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3 text-slate-600">{r.qty}</td>
                <td className="px-4 py-3 text-slate-600">{r.colli}</td>
                <td className="px-4 py-3 text-slate-600">{r.weight}</td>
                <td className="px-4 py-3">
                  <RowActions actions={[
                    { label: 'Detail', icon: 'fi fi-rr-eye', href: `/dashboard/packing-list/${r.id}/view` },
                    { label: 'Cetak', icon: 'fi fi-rr-print', href: `/dashboard/packing-list/${r.id}/print` },
                    { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setTarget(r) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3"><Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} /></div>
      {target && <DeleteModal title="Konfirmasi Hapus" itemName={target.doc_no || target.client_name} busy={deleting} onConfirm={handleDelete} onClose={() => setTarget(null)} />}
    </div>
  );
}
