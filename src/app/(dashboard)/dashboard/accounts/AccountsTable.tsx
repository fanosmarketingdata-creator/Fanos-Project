'use client';

import Select from '@/components/ui/Select';
import { useMemo, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { saveAccount, deleteAccount, type AccountInput } from './actions';

export type AccountRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  phone: string | null;
  photo_url: string | null;
  cursor_color: string;
  team_member_id: string | null;
  team_member_name: string | null;
};

// Kriteria foto profil (sama seperti sistem lama): JPG/PNG/WebP, maks 2MB.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024;

const CURSOR_COLOURS = ['#5B9BF6', '#F2667A', '#F5A524', '#4FD18B', '#B38CF7', '#2DD4BF'];

const emptyForm = (): AccountInput => ({
  email: '',
  password: '',
  full_name: '',
  role: '',
  status: 'Active',
  team_member_id: '',
  phone: '',
  photo_url: '',
  cursor_color: '#5B9BF6',
});

export default function AccountsTable({
  currentUserId,
  initialRows,
  roles,
  teamMembers,
}: {
  currentUserId: string;
  initialRows: AccountRow[];
  roles: string[];
  teamMembers: { id: string; name: string }[];
}) {
  const toast = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<AccountInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter(
      (r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.role.toLowerCase().includes(q)
    );
  }, [initialRows, search]);

  // 1 team member = 1 akun: hanya tampilkan yang belum tertaut ke akun lain
  const availableMembers = useMemo(() => {
    const takenByOthers = new Set(
      initialRows.filter((r) => r.team_member_id && r.id !== form.id).map((r) => r.team_member_id as string)
    );
    return teamMembers.filter((m) => !takenByOthers.has(m.id));
  }, [initialRows, teamMembers, form.id]);

  const editingSelf = form.id === currentUserId;

  function openAdd() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(r: AccountRow) {
    setForm({
      id: r.id,
      email: r.email,
      password: '',
      full_name: r.full_name,
      role: r.role,
      status: r.status,
      team_member_id: r.team_member_id || '',
      phone: r.phone || '',
      photo_url: r.photo_url || '',
      cursor_color: r.cursor_color || '#5B9BF6',
    });
    setModalOpen(true);
  }

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast('Format berkas tidak didukung. Gunakan format JPG, PNG, atau WebP.', 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast('Ukuran berkas melebihi batas maksimum 2 MB.', 'error');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('profile-photos').upload(path, file);
    setUploading(false);

    if (error) {
      toast('Unggah berkas gagal: ' + error.message, 'error');
      return;
    }
    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
    setForm((f) => ({ ...f, photo_url: data.publicUrl }));
    toast('Foto produk berhasil diunggah', 'success');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveAccount(form);
      if (result.error) {
        toast(result.error, 'error');
        return;
      }
      toast(form.id ? 'Akun berhasil diperbarui' : 'Akun berhasil dibuat', 'success');
      setModalOpen(false);
    } catch (e) {
      // Server Action yang melempar exception (mis. env belum diset, timeout)
      // jangan sampai membuat tombol "Menyimpan..." menggantung selamanya.
      toast('Akun gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteAccount(deleteTarget.id);
      if (result.error) {
        toast(result.error, 'error');
        return;
      }
      toast('Akun berhasil dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Akun gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-user-lock" style={{ fontSize: 16, color: '#2563eb' }} /> Master Akun</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari nama / email / role..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <button
          onClick={openAdd}
          className="btn btn-primary"
        >
          <i className="fi fi-rr-plus" /> Tambah Akun
        </button>
      </div>
      </div>
      

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Akun</th>
              <th className="px-4 py-3 font-semibold">Team Member</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Warna Kursor</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Belum terdapat data akun
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-sm font-bold text-brand-600">
                      {r.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        r.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        {r.full_name}
                        {r.id === currentUserId && <span className="ml-1.5 text-[10px] font-bold text-brand-600">(Anda)</span>}
                      </div>
                      <div className="text-xs text-slate-400">{r.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.team_member_name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.role}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: r.cursor_color }} />
                    {r.cursor_color.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                      r.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    {r.id !== currentUserId && (
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
          title={form.id ? 'Edit Akun' : 'Tambah Akun'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 text-center hover:border-brand-500 hover:bg-brand-50"
              >
                {uploading ? (
                  <span className="text-xs text-slate-400">Sedang mengunggah...</span>
                ) : form.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-3 text-[11px] text-slate-400">Klik atau seret foto</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <p className="mt-1.5 w-28 text-center text-[10px] leading-snug text-slate-400">
                JPG/PNG/WebP, maks 2MB. Disarankan foto wajah persegi.
              </p>
            </div>

            <div className="w-full min-w-0 flex-1 space-y-3">
              <Field label="Nama Lengkap *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              <Field
                label="Email (untuk login) *"
                value={form.email}
                disabled={!!form.id}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label={form.id ? 'Reset Password (kosongkan jika tidak diubah)' : 'Password * (min. 8 karakter)'}
                type="password"
                value={form.password || ''}
                onChange={(v) => setForm({ ...form, password: v })}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Role Group *</label>
              <Select
                value={form.role}
                disabled={editingSelf}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50"
              >
                <option value="">-- Pilih Role --</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
              <Select
                value={form.status}
                disabled={editingSelf}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 disabled:bg-slate-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Team Member</label>
              <Select
                value={form.team_member_id || ''}
                onChange={(e) => setForm({ ...form, team_member_id: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">-- Tidak ditautkan --</option>
                {availableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <Field label="Phone" value={form.phone || ''} onChange={(v) => setForm({ ...form, phone: v })} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Warna Kursor</label>
              <div className="flex flex-wrap items-center gap-2">
                {CURSOR_COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Warna kursor ${c}`}
                    aria-pressed={(form.cursor_color || '').toLowerCase() === c.toLowerCase()}
                    onClick={() => setForm({ ...form, cursor_color: c })}
                    className="h-7 w-7 rounded-full border-2 border-transparent shadow-inner aria-pressed:border-slate-800"
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Pilih warna kursor lain"
                  value={form.cursor_color || '#5B9BF6'}
                  onChange={(e) => setForm({ ...form, cursor_color: e.target.value.toUpperCase() })}
                  className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                />
                <span className="text-xs text-slate-400">{(form.cursor_color || '#5B9BF6').toUpperCase()}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Warna panah dan tag nama untuk akun ini. Hanya Superuser yang dapat mengubahnya.</p>
            </div>
          </div>
          {editingSelf && (
            <p className="mt-3 text-[11px] text-slate-400">
              Role dan status akun Anda dikunci agar Anda tidak kehilangan akses ke sistem.
            </p>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Hapus Akun"
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
            Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget.full_name}</strong> ({deleteTarget.email})? Pengguna ini tidak
            akan dapat masuk ke sistem lagi. Untuk menutup akses sementara, ubah statusnya menjadi Inactive.
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
  type = 'text',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={type === 'password' ? 'new-password' : undefined}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 disabled:bg-slate-50"
      />
    </div>
  );
}
