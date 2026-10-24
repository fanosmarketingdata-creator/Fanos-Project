'use client';

import { useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import RowActions from '@/components/ui/RowActions';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { DetailModal, DvCard } from '@/components/registry/RegistryModal';
import { useToast } from '@/components/Toast';
import { getCollectionDetail } from '../payments/actions';

export type OutstandingRow = {
  id: string; doc_no: string | null; inv_date: string; status: string;
  grand_total: number; paid: number; remaining: number; client_name: string;
};
type Detail = NonNullable<Awaited<ReturnType<typeof getCollectionDetail>>>;

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const statusBadge: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

export default function OutstandingTable({ initialRows }: { initialRows: OutstandingRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const openRef = useRef(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => [r.doc_no, r.client_name].some((v) => (v || '').toLowerCase().includes(q)));
  }, [initialRows, search]);
  const paged = usePaged(filtered, search);
  const totalOwing = filtered.reduce((s, r) => s + r.remaining, 0);
  const totalPaid = filtered.reduce((s, r) => s + r.paid, 0);

  async function openDetail(id: string) {
    openRef.current = true;
    setLoading(true);
    try {
      const d = await getCollectionDetail(id);
      if (!openRef.current) return; // modal ditutup saat data masih dimuat
      if (!d) { setLoading(false); return toast('Invoice tidak ditemukan', 'error'); }
      setDetail(d);
    } catch (e) {
      toast('Detail gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-triangle-warning" style={{ fontSize: 16, color: '#2563eb' }} /> Outstanding</h3>
        <div className="flex-wrap"><div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari invoice atau client..." value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400">Total Piutang (Belum Dibayar)</div>
          <div className="mt-1 text-lg font-bold text-red-600">{rp(totalOwing)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400">Sudah Dibayar</div>
          <div className="mt-1 text-lg font-bold text-emerald-600">{rp(totalPaid)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400">Jumlah Invoice</div>
          <div className="mt-1 text-lg font-bold text-slate-800">{filtered.length}</div>
        </div>
      </div>


      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Tanggal Invoice</th>
              <th className="px-4 py-3 font-semibold">Umur</th>
              <th className="px-4 py-3 font-semibold">Grand Total</th>
              <th className="px-4 py-3 font-semibold">Sudah Dibayar</th>
              <th className="px-4 py-3 font-semibold">Belum Dibayar</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Tidak terdapat piutang berjalan.</td></tr>
            )}
            {paged.pageItems.map((r) => {
              const age = Math.floor((Date.now() - new Date(r.inv_date).getTime()) / 86400000);
              return (
                <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; openDetail(r.id); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(r.inv_date)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${age > 60 ? 'bg-red-100 text-red-700' : age > 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{age} hari</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{rp(r.grand_total)}</td>
                  <td className="px-4 py-3 text-emerald-700">{rp(r.paid)}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{rp(r.remaining)}</td>
                  <td className="px-4 py-3">
                    <RowActions actions={[
                      { label: 'Detail', icon: 'fi fi-rr-eye', onClick: () => openDetail(r.id) },
                      { label: 'Payment', icon: 'fi fi-rr-money-bill-wave', href: `/dashboard/payments/new?invoice=${r.id}` },
                    ]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3">
        <Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} />
      </div>
      {loading && !detail && (
        <DetailModal title="Detail Outstanding" onClose={() => { openRef.current = false; setLoading(false); }}>
          <div className="dv2-loading"><div className="spinner" />Memuat detail...</div>
        </DetailModal>
      )}

      {detail && (
        <DetailModal title="Detail Outstanding" onClose={() => { openRef.current = false; setDetail(null); }}>
          <div className="dv2">
            <div className="dv2-topbar">
              <div>
                <div className="dv2-topbar-id">{detail.doc_no || 'Invoice'}</div>
                <div className="dv2-topbar-title">{detail.client_name}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge[detail.status] || 'bg-slate-100 text-slate-600'}`}>{detail.status}</span>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-receipt" label="Grand Total Invoice" value={rp(detail.grand_total)} />
              <DvCard icon="fi fi-rr-check" label="Sudah Dibayar" value={rp(detail.total_paid + detail.paid_discount + detail.credit_applied)} color="#16a34a" />
              <DvCard icon="fi fi-rr-time-quarter-past" label="Belum Dibayar" value={rp(detail.remaining)} color="#dc2626" />
              <DvCard icon="fi fi-rr-calendar" label="Tanggal Invoice" value={fmt(detail.inv_date)} />
            </div>

            <div className="dv2-section-title"><i className="fi fi-rr-boxes" /> Daftar Item</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-[12px]">
                <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="px-2 py-1.5">SKU</th><th className="px-2 py-1.5">Nama Produk</th><th className="px-2 py-1.5 text-right">Qty</th><th className="px-2 py-1.5 text-right">Harga</th><th className="px-2 py-1.5 text-right">Total</th>
                </tr></thead>
                <tbody>
                  {detail.items.map((it, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{it.sku}</td><td className="px-2 py-1.5">{it.name}</td>
                      <td className="px-2 py-1.5 text-right">{it.qty}</td><td className="px-2 py-1.5 text-right">{rp(it.unit_price)}</td><td className="px-2 py-1.5 text-right">{rp(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="dv2-section-title"><i className="fi fi-rr-wallet" /> Riwayat Pembayaran</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-[12px]">
                <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="px-2 py-1.5">Payment ID</th><th className="px-2 py-1.5">Tanggal</th><th className="px-2 py-1.5 text-right">Jumlah</th><th className="px-2 py-1.5 text-right">Discount</th><th className="px-2 py-1.5">Metode</th>
                </tr></thead>
                <tbody>
                  {detail.payments.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-center text-slate-400">Belum terdapat data pembayaran</td></tr>}
                  {detail.payments.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{p.doc_no || '-'}</td><td className="px-2 py-1.5">{fmt(p.pay_date)}</td>
                      <td className="px-2 py-1.5 text-right">{rp(p.amount)}</td><td className="px-2 py-1.5 text-right">{rp(p.discount)}</td><td className="px-2 py-1.5">{p.method || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Link href={`/dashboard/payments/new?invoice=${detail.id}`} className="btn btn-primary">
                <i className="fi fi-rr-money-bill-wave" /> Bayar Sekarang
              </Link>
            </div>
          </div>
        </DetailModal>
      )}
    </div>
  );
}
