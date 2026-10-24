'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { saveTeamMember, deleteTeamMember, type TeamMemberInput } from './actions';

export type TeamMemberRow = {
  id: string;
  name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  has_account: boolean;
  photo_url: string | null;
};

const emptyForm: TeamMemberInput = { name: '', role_title: '', email: '', phone: '' };

export default function TeamMembersTable({ initialRows }: { initialRows: TeamMemberRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<TeamMemberInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMemberRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => r.name.toLowerCase().includes(q) || (r.role_title || '').toLowerCase().includes(q));
  }, [initialRows, search]);

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(r: TeamMemberRow) {
    setForm({ id: r.id, name: r.name, role_title: r.role_title || '', email: r.email || '', phone: r.phone || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveTeamMember(form);
    setSaving(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(form.id ? 'Data Team member berhasil diperbarui' : 'Data Team member berhasil ditambahkan', 'success');
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteTeamMember(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Data Team member berhasil dihapus', 'success');
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="card-header">
        <h3><i className="fi fi-rr-users-alt" style={{ fontSize: 16, color: '#2563eb' }} /> Master Team Member</h3>
        <div className="flex-wrap">
        <div className="search-box"><span className="search-icon"><i className="fa-solid fa-search" /></span><input type="text" placeholder="Cari nama / jabatan..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <button
          onClick={openAdd}
          className="btn btn-primary"
        >
          <i className="fi fi-rr-plus" /> Tambah Team Member
        </button>
      </div>
      </div>
      

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Nama</th>
              <th className="px-4 py-3 font-semibold">Jabatan</th>
              <th className="px-4 py-3 font-semibold">Kontak</th>
              <th className="px-4 py-3 font-semibold">Akun Login</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Belum terdapat data team member
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
                        r.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-slate-800">{r.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.role_title || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.phone || r.email || '-'}</td>
                <td className="px-4 py-3">
                  {r.has_account ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                      Punya akun
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">
                      Belum
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
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
          title={form.id ? 'Edit Team Member' : 'Tambah Team Member'}
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
            <Field label="Nama *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Jabatan" value={form.role_title || ''} onChange={(v) => setForm({ ...form, role_title: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email" value={form.email || ''} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Phone" value={form.phone || ''} onChange={(v) => setForm({ ...form, phone: v })} />
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Hapus Team Member"
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
            Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong>?
            {deleteTarget.has_account && ' Akun login-nya tidak ikut terhapus, hanya tautan ke team member ini yang dilepas.'}
          </p>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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
