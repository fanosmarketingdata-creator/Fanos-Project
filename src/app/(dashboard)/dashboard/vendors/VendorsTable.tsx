'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { saveVendor, deleteVendor, type VendorInput } from './actions';

export type VendorRow = {
  id: string;
  company: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

const emptyForm: VendorInput = { company: '', contact_name: '', phone: '', email: '', address: '' };

export default function VendorsTable({ initialVendors }: { initialVendors: VendorRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<VendorInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialVendors;
    return initialVendors.filter(
      (v) => v.company.toLowerCase().includes(q) || (v.contact_name || '').toLowerCase().includes(q)
    );
  }, [initialVendors, search]);

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(v: VendorRow) {
    setForm({
      id: v.id,
      company: v.company,
      contact_name: v.contact_name || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveVendor(form);
    setSaving(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(form.id ? 'Vendor diperbarui' : 'Vendor ditambahkan', 'success');
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteVendor(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Vendor dihapus', 'success');
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari vendor..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Tambah Vendor
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum ada data vendor
                </td>
              </tr>
            )}
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">{v.company}</td>
                <td className="px-4 py-3 text-slate-600">{v.contact_name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{v.phone || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{v.email || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(v)}
                      className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(v)}
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
          title={form.id ? 'Edit Vendor' : 'Tambah Vendor'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
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
            <Field label="Nama Perusahaan *" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <Field label="Contact Name" value={form.contact_name || ''} onChange={(v) => setForm({ ...form, contact_name: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" value={form.phone || ''} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Email" value={form.email || ''} onChange={(v) => setForm({ ...form, email: v })} />
            </div>
            <Field label="Address" value={form.address || ''} onChange={(v) => setForm({ ...form, address: v })} />
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Hapus Vendor"
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
            Yakin ingin menghapus vendor <strong>{deleteTarget.company}</strong>? Tindakan ini tidak bisa dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />
    </div>
  );
}
