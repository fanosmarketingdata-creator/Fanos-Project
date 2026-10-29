'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { FormModal } from '@/components/registry/RegistryModal';
import { useLang } from '@/components/I18nProvider';
import { PERMISSION_GROUPS, ALL_MENU_KEYS, CRUD_ACTIONS, flatItems, navLabel, type CrudAction, type RoleActions } from '@/lib/menu';
import { saveRole, deleteRole, saveRolePermissions, type RoleInput } from './actions';

export type RoleRow = { id: string; name: string; description: string | null; account_count: number; permissions: string[]; role_actions: RoleActions };

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
  const [acts, setActs] = useState<RoleActions>({});
  const [permSearch, setPermSearch] = useState('');
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
    setPermSearch('');
    if (r.name === PROTECTED_ROLE) {
      setPerms(ALL_MENU_KEYS);
      setActs(Object.fromEntries(ALL_MENU_KEYS.map((k) => [k, [...CRUD_ACTIONS]])));
      return;
    }
    setPerms(r.permissions);
    // Menu tanpa catatan Create/Edit/Delete (data lama) dianggap berhak penuh.
    setActs(Object.fromEntries(r.permissions.map((k) => [k, r.role_actions[k] ?? [...CRUD_ACTIONS]])));
  }
  const hasView = (k: string) => perms.includes(k);
  const hasAct = (k: string, a: CrudAction) => !!acts[k]?.includes(a);
  const rowFull = (k: string) => hasView(k) && CRUD_ACTIONS.every((a) => hasAct(k, a));

  function setRow(keys: string[], view: boolean, list: CrudAction[]) {
    setPerms((p) => (view ? Array.from(new Set([...p, ...keys])) : p.filter((x) => !keys.includes(x))));
    setActs((cur) => {
      const next = { ...cur };
      keys.forEach((k) => { if (view) next[k] = [...list]; else delete next[k]; });
      return next;
    });
  }
  function toggleView(k: string) {
    if (hasView(k)) setRow([k], false, []);
    else setRow([k], true, []);
  }
  function toggleAct(k: string, a: CrudAction) {
    if (!hasView(k)) {
      setRow([k], true, [a]);
      return;
    }
    setActs((cur) => {
      const list = cur[k] ?? [];
      return { ...cur, [k]: list.includes(a) ? list.filter((x) => x !== a) : [...list, a] };
    });
  }
  function toggleRowAll(k: string) {
    if (rowFull(k)) setRow([k], false, []);
    else setRow([k], true, [...CRUD_ACTIONS]);
  }
  // Toggle satu kolom (View / Create / Edit / Delete) untuk sekelompok menu.
  function toggleColumn(keys: string[], col: 'view' | CrudAction) {
    if (col === 'view') {
      const all = keys.every(hasView);
      if (all) setRow(keys, false, []);
      else setPerms((p) => Array.from(new Set([...p, ...keys])));
      if (!all) setActs((cur) => { const n = { ...cur }; keys.forEach((k) => { n[k] = n[k] ?? []; }); return n; });
      return;
    }
    const all = keys.every((k) => hasView(k) && hasAct(k, col));
    setPerms((p) => (all ? p : Array.from(new Set([...p, ...keys]))));
    setActs((cur) => {
      const n = { ...cur };
      keys.forEach((k) => {
        const list = n[k] ?? [];
        n[k] = all ? list.filter((x) => x !== col) : Array.from(new Set([...list, col]));
      });
      return n;
    });
  }
  const preset = (kind: 'full' | 'view' | 'none') => {
    if (kind === 'none') return setRow(ALL_MENU_KEYS, false, []);
    setRow(ALL_MENU_KEYS, true, kind === 'full' ? [...CRUD_ACTIONS] : []);
  };

  async function handleSavePerms() {
    if (!permTarget) return;
    setSavingPerm(true);
    const result = await saveRolePermissions(permTarget.id, perms, acts);
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
        <FormModal full
          title={`Hak Akses — ${permTarget.name}`}
          icon="fi fi-rr-shield-check"
          maxWidth={980}
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
          {(() => {
            const locked = permTarget.name === PROTECTED_ROLE;
            const q = permSearch.trim().toLowerCase();
            const COLS: { key: 'view' | CrudAction; label: string; icon: string }[] = [
              { key: 'view', label: 'View', icon: 'fi fi-rr-eye' },
              { key: 'create', label: 'Create', icon: 'fi fi-rr-plus' },
              { key: 'edit', label: 'Edit', icon: 'fi fi-rr-pencil' },
              { key: 'delete', label: 'Delete', icon: 'fi fi-rr-trash' },
            ];
            const cell = (k: string, c: 'view' | CrudAction) => {
              const on = c === 'view' ? hasView(k) : hasAct(k, c) && hasView(k);
              return (
                <td key={c} className="rm-c">
                  <input type="checkbox" checked={on} disabled={locked} onChange={() => (c === 'view' ? toggleView(k) : toggleAct(k, c))} />
                </td>
              );
            };
            return (
              <>
                {locked ? (
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Role Superuser selalu memiliki akses penuh dan tidak dapat diubah.</p>
                ) : (
                  <div className="rm-bar">
                    <div className="search-box" style={{ maxWidth: 280 }}>
                      <span className="search-icon"><i className="fa-solid fa-search" /></span>
                      <input type="text" placeholder="Cari menu..." value={permSearch} onChange={(e) => setPermSearch(e.target.value)} />
                    </div>
                    <div className="rm-presets">
                      <button type="button" className="btn btn-secondary btn-xs" onClick={() => preset('full')}>Akses Penuh</button>
                      <button type="button" className="btn btn-secondary btn-xs" onClick={() => preset('view')}>Hanya Lihat</button>
                      <button type="button" className="btn btn-secondary btn-xs" onClick={() => preset('none')}>Kosongkan</button>
                    </div>
                  </div>
                )}
                <div className="rm-wrap">
                  <table className="rm-table">
                    <thead>
                      <tr>
                        <th>Menu</th>
                        {COLS.map((c) => (
                          <th key={c.key} className="rm-c"><i className={c.icon} /> {c.label}</th>
                        ))}
                        <th className="rm-c">Semua</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_GROUPS.map((g) => {
                        const leaves = flatItems(g.items);
                        const shown = leaves.filter((i) => !q || navLabel(lang, i.label).toLowerCase().includes(q) || i.label.toLowerCase().includes(q));
                        if (shown.length === 0) return null;
                        const keys = leaves.map((i) => i.href);
                        const rows: React.ReactNode[] = [];
                        rows.push(
                          <tr key={g.id} className="rm-group">
                            <td><i className={g.icon} /> {navLabel(lang, g.label)}</td>
                            {COLS.map((c) => {
                              const all = keys.every((k) => (c.key === 'view' ? hasView(k) : hasView(k) && hasAct(k, c.key as CrudAction)));
                              return (
                                <td key={c.key} className="rm-c">
                                  <input type="checkbox" checked={all} disabled={locked} onChange={() => toggleColumn(keys, c.key)} />
                                </td>
                              );
                            })}
                            <td className="rm-c">
                              <input type="checkbox" checked={keys.every(rowFull)} disabled={locked} onChange={() => (keys.every(rowFull) ? setRow(keys, false, []) : setRow(keys, true, [...CRUD_ACTIONS]))} />
                            </td>
                          </tr>
                        );
                        g.items.forEach((it) => {
                          const list = it.children ?? [it];
                          const vis = list.filter((i) => shown.includes(i));
                          if (vis.length === 0) return;
                          if (it.children) rows.push(<tr key={it.href + '-h'} className="rm-sub"><td colSpan={6}><i className={it.icon} /> {navLabel(lang, it.label)}</td></tr>);
                          vis.forEach((i) => {
                            rows.push(
                              <tr key={i.href} className="rm-row">
                                <td style={{ paddingLeft: it.children ? 38 : 22 }}><i className={i.icon} style={{ color: '#9ca3af', width: 16, textAlign: 'center', marginRight: 6 }} />{navLabel(lang, i.label)}</td>
                                {COLS.map((c) => cell(i.href, c.key))}
                                <td className="rm-c"><input type="checkbox" checked={rowFull(i.href)} disabled={locked} onChange={() => toggleRowAll(i.href)} /></td>
                              </tr>
                            );
                          });
                        });
                        return rows;
                      })}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
                  View = menu tampil dan datanya bisa dilihat. Create / Edit / Delete = boleh menambah / mengubah / menghapus data pada menu tersebut. Aturan ini juga dicek di server saat menyimpan.
                </p>
              </>
            );
          })()}
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
