'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import ProductPicker, { type ProductOption } from '@/components/ProductPicker';
import { useToast } from '@/components/Toast';
import { saveDefect, deleteDefect, toggleDefectStatus, type DefectInput } from './actions';

export type DefectRow = {
  id: string;
  inspection_date: string;
  sales_order_id: string | null;
  sku: string;
  qty: number;
  description: string | null;
  status: 'OPEN' | 'RESOLVED';
  client_name: string;
};

const emptyForm = (): DefectInput => ({
  inspection_date: new Date().toISOString().split('T')[0],
  sales_order_id: '',
  sku: '',
  qty: 1,
  description: '',
  status: 'OPEN',
});

export default function DefectsTable({
  initialRows,
  soOptions,
  products,
}: {
  initialRows: DefectRow[];
  soOptions: { id: string; label: string }[];
  products: ProductOption[];
}) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<DefectInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DefectRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialRows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.sku.toLowerCase().includes(q) || r.client_name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
    });
  }, [initialRows, search, statusFilter]);

  function openAdd() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(r: DefectRow) {
    setForm({
      id: r.id,
      inspection_date: r.inspection_date,
      sales_order_id: r.sales_order_id || '',
      sku: r.sku,
      qty: r.qty,
      description: r.description || '',
      status: r.status,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveDefect(form);
    setSaving(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(form.id ? 'Defect diperbarui' : 'Defect ditambahkan', 'success');
    setModalOpen(false);
  }

  async function handleToggle(r: DefectRow) {
    const result = await toggleDefectStatus(r.id, r.status);
    if (result.error) toast(result.error, 'error');
    else toast(result.status === 'RESOLVED' ? 'Ditandai selesai' : 'Dibuka kembali', 'success');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDefect(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Defect dihapus', 'success');
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU / client..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'OPEN' | 'RESOLVED')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Tambah Defect
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Client (SO)</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Qty</th>
              <th className="px-4 py-3 font-semibold">Keterangan</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Belum ada data defect
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-600">
                  {new Date(r.inspection_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.client_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.sku}</td>
                <td className="px-4 py-3 text-slate-600">{r.qty}</td>
                <td className="px-4 py-3 text-slate-500">{r.description || '-'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      r.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => handleToggle(r)}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      {r.status === 'OPEN' ? 'Selesaikan' : 'Buka Lagi'}
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      Edit
                    </button>
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

      {modalOpen && (
        <Modal
          title={form.id ? 'Edit Defect' : 'Tambah Defect'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Pemeriksaan *</label>
                <input
                  type="date"
                  value={form.inspection_date}
                  onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as 'OPEN' | 'RESOLVED' })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Sales Order (opsional)</label>
              <select
                value={form.sales_order_id || ''}
                onChange={(e) => setForm({ ...form, sales_order_id: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">-- Tidak terkait SO --</option>
                {soOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">SKU *</label>
                <ProductPicker products={products} value={form.sku} onSelect={(p) => setForm({ ...form, sku: p.sku })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Qty *</label>
                <input
                  type="number"
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Keterangan</label>
              <textarea
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Hapus Defect"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
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
            Yakin ingin menghapus catatan defect <strong>{deleteTarget.sku}</strong>?
          </p>
        </Modal>
      )}
    </div>
  );
}
