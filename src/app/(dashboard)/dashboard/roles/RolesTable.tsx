'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { FormModal } from '@/components/registry/RegistryModal';
import { useLang } from '@/components/I18nProvider';
import { PERMISSION_GROUPS, ALL_MENU_KEYS, flatItems, navLabel } from '@/lib/menu';
import { saveRole, deleteRole, saveRolePermissions, type RoleInput } from './actions';

export type RoleRow = { id: string; name: string; description: string | null; account_count: number; permissions: string[] };

const PROTECTED_ROLE = 'Superuser';

export default function RolesTable({ initialRows }: { initialRows: RoleRow[] }) {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RoleInput>({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const lang = useLang();
  const [permTarget, setPermTarget] = useState<RoleRow | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [savingPerm, setSavingPerm] = useState(false);

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

  function openPerms(r: RoleRow) {
    setPermTarget(r);
    setPerms(r.name === PROTECTED_ROLE ? ALL_MENU_KEYS : r.permissions);
  }
  const toggle = (k: string) => setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const toggleGroup = (keys: string[]) =>
    setPerms((p) => (keys.every((k) => p.includes(k)) ? p.filter((x) => !keys.includes(x)) : Array.from(new Set([...p, ...keys]))));

  async function handleSavePerms() {
    if (!permTarget) return;
    setSavingPerm(true);
    const result = await saveRolePermissions(permTarget.id, perms);
    setSavingPerm(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Hak akses menu berhasil diperbarui', 'success');
    setPermTarget(null);
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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Nama Role</th>
              <th className="px-4 py-3 font-semibold">Deskripsi</th>
              <th className="px-4 py-3 font-semibold">Dipakai</th>
              <th className="px-4 py-3 font-semibold">Akses Menu</th>
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
                <td className="px-4 py-3 text-slate-600">{`${r.account_count} akun`}</td>
                <td className="px-4 py-3 text-slate-600">{r.name === PROTECTED_ROLE ? 'Semua menu' : `${r.permissions.length} dari ${ALL_MENU_KEYS.length} menu`}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openPerms(r)}
                      className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100"
                    >
                      Hak Akses
                    </button>
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

      {permTarget && (
        <FormModal
          title={`Hak Akses Menu — ${permTarget.name}`}
          icon="fi fi-rr-shield-check"
          maxWidth={860}
          onClose={() => setPermTarget(null)}
          footer={
            permTarget.name === PROTECTED_ROLE ? (
              <button type="button" className="btn btn-secondary" onClick={() => setPermTarget(null)}>Tutup</button>
            ) : (
              <>
                <button type="button" className="btn btn-primary" onClick={handleSavePerms} disabled={savingPerm}>
                  <i className="fa-solid fa-floppy-disk" /> {savingPerm ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setPermTarget(null)}>Batal</button>
              </>
            )
          }
        >
          {permTarget.name === PROTECTED_ROLE && (
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Role Superuser selalu memiliki akses penuh dan tidak dapat diubah.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {PERMISSION_GROUPS.map((g) => {
              const keys = flatItems(g.items).map((i) => i.href);
              const locked = permTarget.name === PROTECTED_ROLE;
              const all = keys.every((k) => perms.includes(k));
              return (
                <div key={g.id} className="fv2-sub" style={{ margin: 0 }}>
                  <label className="fv2-sub-head" style={{ cursor: locked ? 'default' : 'pointer', fontWeight: 700, fontSize: 12.5 }}>
                    <input type="checkbox" checked={all} disabled={locked} onChange={() => toggleGroup(keys)} style={{ flex: 'none', width: 16, height: 16, padding: 0 }} />
                    <i className={g.icon} /> {navLabel(lang, g.label)}
                  </label>
                  {g.items.map((i) => {
                    const row = (it: typeof i, indent: number, checked: boolean, onChange: () => void) => (
                      <label key={it.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: `5px 4px 5px ${indent}px`, fontSize: 12.5, cursor: locked ? 'default' : 'pointer', fontWeight: it.children ? 600 : 400 }}>
                        <input type="checkbox" checked={checked} disabled={locked} onChange={onChange} style={{ width: 15, height: 15 }} />
                        <i className={it.icon} style={{ color: '#6b7280', width: 16, textAlign: 'center' }} />
                        {navLabel(lang, it.label)}
                      </label>
                    );
                    if (!i.children) return row(i, 24, perms.includes(i.href), () => toggle(i.href));
                    const ck = i.children.map((c) => c.href);
                    return (
                      <div key={i.href}>
                        {row(i, 24, ck.every((k) => perms.includes(k)), () => toggleGroup(ck))}
                        {i.children.map((c) => row(c, 48, perms.includes(c.href), () => toggle(c.href)))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </FormModal>
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
