'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { saveRole, deleteRole, type RoleInput } from './actions';

export type RoleRow = { id: string; name: string; description: string | null; account_count: number };

const PROTECTED_ROLE = 'Superuser';

export default function RolesTable({ initialRows }: { initialRows: RoleRow[] }) {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RoleInput>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setForm({ name: '', description: '' });
    setModalOpen(true);
  }

  function openEdit(r: RoleRow) {
    setForm({ id: r.id, name: r.name, description: r.description || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveRole(form);
    setSaving(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(form.id ? 'Data Role berhasil diperbarui' : 'Data Role berhasil ditambahkan', 'success');
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteRole(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Data Role berhasil dihapus', 'success');
    setDeleteTarget(null);
  }

  const editingProtected = form.id && initialRows.find((r) => r.id === form.id)?.name === PROTECTED_ROLE;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openAdd}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Tambah Role
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Nama Role</th>
              <th className="px-4 py-3 font-semibold">Deskripsi</th>
              <th className="px-4 py-3 font-semibold">Dipakai</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {r.name}
                  {r.name === PROTECTED_ROLE && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                      Sistem
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{r.description || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.account_count} akun</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    {r.name !== PROTECTED_ROLE && (
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={form.id ? 'Edit Role' : 'Tambah Role'}
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
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Nama Role *</label>
              <input
                value={form.name}
                disabled={!!editingProtected}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Admin, Sales, Warehouse"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Deskripsi</label>
              <input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Hapus Role"
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
            Apakah Anda yakin ingin menghapus role <strong>{deleteTarget.name}</strong>? Role yang masih digunakan oleh akun tidak dapat dihapus.
          </p>
        </Modal>
      )}
    </div>
  );
}
