'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { FormModal, DeleteModal, FvField } from '@/components/registry/RegistryModal';
import FvSelect from '@/components/registry/FvSelect';
import { AvatarStack, Avatar, StatusPill, PriorityPill, Progress, fmtDate, type Member } from './pm-ui';
import { savePmProject, deletePmProject, type PmStatus, type PmPriority } from './actions';

export type PmProjectRow = {
  id: string; name: string; description: string; status: PmStatus; priority: PmPriority;
  start_date: string; end_date: string; owner_id: string; created_at: string;
  task_total: number; task_done: number; member_ids: string[];
};

const STATUSES: PmStatus[] = ['Planning', 'In Progress', 'Completed', 'On Hold'];
const PRIORITIES: PmPriority[] = ['High', 'Medium', 'Low'];
type Form = { id?: string; name: string; description: string; status: PmStatus; priority: PmPriority; start_date: string; end_date: string; owner_id: string; member_ids: string[] };
const empty: Form = { name: '', description: '', status: 'Planning', priority: 'Medium', start_date: '', end_date: '', owner_id: '', member_ids: [] };

function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="pm-dots" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu">•••</button>
      {open && (
        <div className="pm-menu">
          <button type="button" onClick={() => { setOpen(false); onEdit(); }}><i className="fi fi-rr-pencil" /> Edit</button>
          <button type="button" className="danger" onClick={() => { setOpen(false); onDelete(); }}><i className="fi fi-rr-trash" /> Hapus</button>
        </div>
      )}
    </div>
  );
}

export default function ProjectListClient({ rows, members }: { rows: PmProjectRow[]; members: Member[] }) {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPrio, setFPrio] = useState('');
  const [sort, setSort] = useState('added');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<PmProjectRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let r = rows.filter((p) => (!s || p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s)) && (!fStatus || p.status === fStatus) && (!fPrio || p.priority === fPrio));
    if (sort === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'due') r = [...r].sort((a, b) => (a.end_date || '9999').localeCompare(b.end_date || '9999'));
    else if (sort === 'progress') r = [...r].sort((a, b) => (b.task_total ? b.task_done / b.task_total : 0) - (a.task_total ? a.task_done / a.task_total : 0));
    return r;
  }, [rows, q, fStatus, fPrio, sort]);

  function openEdit(p: PmProjectRow) {
    setForm({ id: p.id, name: p.name, description: p.description, status: p.status, priority: p.priority, start_date: p.start_date, end_date: p.end_date, owner_id: p.owner_id, member_ids: p.member_ids });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const r = await savePmProject(form);
      if (r.error) return toast(r.error, 'error');
      toast(form.id ? 'Project berhasil diperbarui' : 'Project berhasil dibuat', 'success');
      setForm(null);
      if (!form.id && r.id) router.push(`/dashboard/project-management/${r.id}`);
      else router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!del) return;
    setDeleting(true);
    try {
      const r = await deletePmProject(del.id);
      if (r.error) return toast(r.error, 'error');
      toast('Project berhasil dihapus', 'success');
      setDel(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const toggleMember = (id: string) =>
    setForm((f) => (f ? { ...f, member_ids: f.member_ids.includes(id) ? f.member_ids.filter((x) => x !== id) : [...f.member_ids, id] } : f));

  return (
    <div>
      <div className="pm-head">
        <div>
          <div className="pm-title">All Projects</div>
          <div className="pm-sub">Kelola semua project dalam satu tempat. Pantau progres dan prioritas dari perencanaan sampai selesai.</div>
        </div>
        <button type="button" className="pm-primary" onClick={() => setForm({ ...empty })}><i className="fi fi-rr-plus" /> New Project</button>
      </div>

      <div className="pm-toolbar">
        <div className="left">
          <div className="pm-search"><i className="fi fi-rr-search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari project..." /></div>
        </div>
        <div className="right">
          <select className="pm-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="added">Terbaru Ditambahkan</option>
            <option value="name">Nama A–Z</option>
            <option value="due">Deadline Terdekat</option>
            <option value="progress">Progres Tertinggi</option>
          </select>
          <select className="pm-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Semua Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="pm-select" value={fPrio} onChange={(e) => setFPrio(e.target.value)}>
            <option value="">Semua Prioritas</option>
            {PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="pm-viewtoggle">
            <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} title="Grid"><i className="fi fi-rr-apps" /></button>
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} title="List"><i className="fi fi-rr-list" /></button>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="pm-empty-page">{rows.length === 0 ? 'Belum ada project. Klik "New Project" untuk memulai.' : 'Tidak ada project yang cocok dengan filter.'}</div>
      ) : (
        <div className={view === 'grid' ? 'pm-grid' : 'pm-list'}>
          {list.map((p) => {
            const owner = byId.get(p.owner_id);
            const pct = p.task_total ? (p.task_done / p.task_total) * 100 : 0;
            const team = p.member_ids.map((id) => byId.get(id)).filter(Boolean) as Member[];
            return (
              <div key={p.id} className="pm-card" onClick={() => router.push(`/dashboard/project-management/${p.id}`)}>
                <div className="pm-card-top">
                  <div className="pm-badges"><StatusPill s={p.status} /><PriorityPill p={p.priority} /></div>
                  <CardMenu onEdit={() => openEdit(p)} onDelete={() => setDel(p)} />
                </div>
                <h3>{p.name}</h3>
                <p>{p.description || 'Belum ada deskripsi.'}</p>
                <div className="pm-prog"><Progress pct={pct} /></div>
                <div className="pm-card-row">
                  <span className="pm-chip"><i className="fi fi-rr-calendar" /> {fmtDate(p.start_date)} – {fmtDate(p.end_date)}</span>
                  {owner && <span className="pm-chip"><i className="fi fi-rr-user" /> {owner.name}</span>}
                </div>
                <div className="pm-card-row">
                  <span className="pm-chip"><i className="fi fi-rr-document" /> {p.task_done}/{p.task_total} task selesai</span>
                  <AvatarStack members={team} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <FormModal
          full
          title={form.id ? 'Edit Project' : 'New Project'}
          icon={form.id ? 'fa-solid fa-pencil' : 'fa-solid fa-folder-plus'}
          onClose={() => setForm(null)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Batal</button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-briefcase" /> Informasi Project</div>
            <div className="fv2-grid cols-1">
              <FvField label="Nama Project" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama project" />
              </FvField>
              <FvField label="Deskripsi">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ringkasan tujuan dan ruang lingkup project" />
              </FvField>
            </div>
            <div className="fv2-grid" style={{ marginTop: 14 }}>
              <FvField label="Status">
                <FvSelect value={form.status} onChange={(v) => setForm({ ...form, status: v as PmStatus })} options={STATUSES.map((s) => ({ value: s, label: s }))} />
              </FvField>
              <FvField label="Prioritas">
                <FvSelect value={form.priority} onChange={(v) => setForm({ ...form, priority: v as PmPriority })} options={PRIORITIES.map((s) => ({ value: s, label: s }))} />
              </FvField>
              <FvField label="Tanggal Mulai"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></FvField>
              <FvField label="Tanggal Selesai"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></FvField>
            </div>
          </div>
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-users" /> Tim</div>
            <FvField label="Project Owner">
              <FvSelect value={form.owner_id} onChange={(v) => setForm({ ...form, owner_id: v })} options={members.map((m) => ({ value: m.id, label: m.name }))} placeholder="— Pilih owner —" />
            </FvField>
            <div style={{ marginTop: 14 }}>
              <div className="fv2-field"><label>Anggota Tim</label></div>
              {members.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94a3b8' }}>Belum ada Team Member. Tambahkan di Superuser &gt; Master Team Member.</p>
              ) : (
                <div className="pm-chips" style={{ marginTop: 8 }}>
                  {members.map((m) => {
                    const on = form.member_ids.includes(m.id) || form.owner_id === m.id;
                    return (
                      <button key={m.id} type="button" onClick={() => toggleMember(m.id)} className="pm-who" style={{ cursor: 'pointer', border: on ? '1.5px solid #3563e9' : '1.5px solid transparent', background: on ? '#eef3ff' : '#f4f6fa', paddingRight: 10 }}>
                        <Avatar m={m} /> {m.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </FormModal>
      )}

      {del && <DeleteModal title="Konfirmasi Hapus" itemName={del.name} busy={deleting} onConfirm={remove} onClose={() => setDel(null)} />}
    </div>
  );
}
