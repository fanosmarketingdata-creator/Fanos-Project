'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import RowActions from '@/components/ui/RowActions';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { DetailModal, DvCard, FormModal, FvField } from '@/components/registry/RegistryModal';
import SearchSelect from '@/components/registry/SearchSelect';
import FinanceSelect from '@/components/registry/FinanceSelect';
import RupiahInput from '@/components/ui/RupiahInput';
import { useToast } from '@/components/Toast';
import { getCreditNoteDetail, getApplicableInvoices, applyCreditNote, refundCreditNote } from './actions';

export type CNRow = {
  id: string; doc_no: string | null; cn_date: string; amount: number; applied: number; refunded: number;
  status: string; client_name: string; invoice_no: string; return_no: string;
};
type Detail = NonNullable<Awaited<ReturnType<typeof getCreditNoteDetail>>>;

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const badge: Record<string, string> = { ISSUED: 'bg-blue-100 text-blue-700', PARTIAL: 'bg-amber-100 text-amber-700', CLOSED: 'bg-emerald-100 text-emerald-700' };

export default function CreditNoteTable({ initialRows }: { initialRows: CNRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [mode, setMode] = useState<{ type: 'apply' | 'refund'; row: CNRow } | null>(null);
  const [invoices, setInvoices] = useState<{ id: string; doc_no: string | null; inv_date: string; remaining: number }[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => [r.doc_no, r.client_name, r.invoice_no, r.return_no].some((v) => (v || '').toLowerCase().includes(q)));
  }, [initialRows, search]);
  const paged = usePaged(filtered, search);
  const totalIssued = filtered.reduce((s, r) => s + r.amount, 0);
  const totalBalance = filtered.reduce((s, r) => s + (r.amount - r.applied - r.refunded), 0);

  async function openDetail(id: string) {
    try {
      const d = await getCreditNoteDetail(id);
      if (!d) return toast('Credit Note tidak ditemukan', 'error');
      setDetail(d);
    } catch (e) {
      toast('Detail gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    }
  }

  async function openMode(type: 'apply' | 'refund', row: CNRow) {
    setMode({ type, row });
    setInvoiceId(''); setMethod(''); setReference('');
    setAmount(Math.round(row.amount - row.applied - row.refunded));
    setDate(new Date().toISOString().split('T')[0]);
    if (type === 'apply') {
      try { setInvoices(await getApplicableInvoices(row.id)); } catch { setInvoices([]); }
    }
  }

  async function submit() {
    if (!mode) return;
    setSaving(true);
    try {
      const r = mode.type === 'apply' ? await applyCreditNote(mode.row.id, invoiceId, amount, date) : await refundCreditNote(mode.row.id, amount, date, method, reference);
      if (r.error) return toast(r.error, 'error');
      toast(mode.type === 'apply' ? 'Credit Note berhasil dipakai ke invoice' : 'Refund berhasil dicatat', 'success');
      setMode(null);
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400">Total Credit Note Diterbitkan</div>
          <div className="mt-1 text-lg font-bold text-slate-800">{rp(totalIssued)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400">Saldo Kredit Belum Terpakai</div>
          <div className="mt-1 text-lg font-bold text-blue-600">{rp(totalBalance)}</div>
        </div>
      </div>

      <div className="relative mb-4 w-full max-w-xs">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-search text-[13px]" /></span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari credit note, client, invoice..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Nilai</th>
              <th className="px-4 py-3 font-semibold">Dipakai</th>
              <th className="px-4 py-3 font-semibold">Refund</th>
              <th className="px-4 py-3 font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Belum terdapat data credit note</td></tr>}
            {paged.pageItems.map((r) => {
              const bal = r.amount - r.applied - r.refunded;
              return (
                <tr key={r.id} onClick={(e) => { if ((e.target as HTMLElement).closest('a,button,input,select')) return; openDetail(r.id); }} className="clickable-row border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.doc_no || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.client_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.invoice_no}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(r.cn_date)}</td>
                  <td className="px-4 py-3 text-slate-600">{rp(r.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">{rp(r.applied)}</td>
                  <td className="px-4 py-3 text-slate-600">{rp(r.refunded)}</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{rp(bal)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${badge[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                  <td className="px-4 py-3">
                    <RowActions actions={[
                      { label: 'Detail', icon: 'fi fi-rr-eye', onClick: () => openDetail(r.id) },
                      { label: 'Pakai ke Invoice', icon: 'fi fi-rr-receipt', onClick: () => openMode('apply', r), hidden: bal <= 0 },
                      { label: 'Refund', icon: 'fi fi-rr-hand-holding-usd', onClick: () => openMode('refund', r), hidden: bal <= 0 },
                      { label: 'Cetak', icon: 'fi fi-rr-print', href: `/dashboard/credit-notes/${r.id}/print` },
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

      {detail && (
        <DetailModal title="Detail Credit Note" onClose={() => setDetail(null)}>
          <div className="dv2">
            <div className="dv2-topbar">
              <div><div className="dv2-topbar-id">{detail.doc_no || 'Credit Note'}</div><div className="dv2-topbar-title">{detail.client_name}</div></div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${badge[detail.status] || 'bg-slate-100 text-slate-600'}`}>{detail.status}</span>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-badge-percent" label="Nilai Credit Note" value={rp(detail.amount)} />
              <DvCard icon="fi fi-rr-receipt" label="Dipakai ke Invoice" value={rp(detail.applied)} color="#16a34a" />
              <DvCard icon="fi fi-rr-hand-holding-usd" label="Direfund" value={rp(detail.refunded)} color="#d97706" />
              <DvCard icon="fi fi-rr-wallet" label="Saldo Kredit" value={rp(detail.amount - detail.applied - detail.refunded)} color="#2563eb" />
              <DvCard icon="fi fi-rr-receipt" label="Invoice Asal" value={detail.invoice_no} />
              <DvCard icon="fi fi-rr-undo" label="Return" value={detail.return_no} />
            </div>
            <div className="dv2-section-title"><i className="fi fi-rr-list" /> Riwayat Pemakaian</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-[12px]">
                <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500"><th className="px-2 py-1.5">Jenis</th><th className="px-2 py-1.5">Tanggal</th><th className="px-2 py-1.5">Invoice</th><th className="px-2 py-1.5">Metode / Ref</th><th className="px-2 py-1.5 text-right">Jumlah</th></tr></thead>
                <tbody>
                  {detail.apps.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-center text-slate-400">Belum ada pemakaian</td></tr>}
                  {detail.apps.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{a.kind === 'APPLY' ? 'Pakai ke Invoice' : 'Refund'}</td>
                      <td className="px-2 py-1.5">{fmt(a.date)}</td>
                      <td className="px-2 py-1.5">{a.kind === 'APPLY' ? a.invoice_no : '-'}</td>
                      <td className="px-2 py-1.5">{[a.method, a.reference].filter(Boolean).join(' / ') || '-'}</td>
                      <td className="px-2 py-1.5 text-right">{rp(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DetailModal>
      )}

      {mode && (
        <FormModal
          title={mode.type === 'apply' ? 'Pakai Credit Note ke Invoice' : 'Refund Credit Note'}
          icon={mode.type === 'apply' ? 'fi fi-rr-receipt' : 'fi fi-rr-hand-holding-usd'}
          onClose={() => setMode(null)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setMode(null)}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={saving || amount <= 0 || (mode.type === 'apply' && !invoiceId)}>
                <i className="fi fi-rr-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Saldo Credit Note: <strong>{rp(mode.row.amount - mode.row.applied - mode.row.refunded)}</strong></p>
            <div className="fv2-grid">
              {mode.type === 'apply' && (
                <FvField label="Invoice" required>
                  <SearchSelect value={invoiceId} placeholder="Cari invoice..." onChange={(v, o) => { setInvoiceId(v); const inv = invoices.find((i) => i.id === v); if (inv) setAmount(Math.min(inv.remaining, mode.row.amount - mode.row.applied - mode.row.refunded)); void o; }}
                    options={invoices.map((i) => ({ value: i.id, label: i.doc_no || '-', sub: `Sisa ${rp(i.remaining)}` }))} />
                </FvField>
              )}
              <FvField label="Tanggal" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
              <FvField label="Jumlah" required><RupiahInput value={amount} onValue={setAmount} /></FvField>
              {mode.type === 'refund' && (
                <>
                  <FvField label="Metode Refund"><FinanceSelect kind="payment_method" value={method} onChange={setMethod} /></FvField>
                  <FvField label="No. Referensi"><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. transfer / bukti refund" /></FvField>
                </>
              )}
            </div>
            {mode.type === 'apply' && invoices.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Client ini tidak memiliki invoice dengan sisa tagihan.</p>}
          </div>
        </FormModal>
      )}
    </div>
  );
}
