'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import Select from '@/components/ui/Select';
import { FormModal, DeleteModal, FvField } from '@/components/registry/RegistryModal';
import FvSelect from '@/components/registry/FvSelect';
import { Avatar, AvatarStack, StatusPill, PriorityPill, fmtDate, fmtDateTime, type Member } from '../pm-ui';
import {
  savePmProject, addProjectMember, removeProjectMember, saveTask, moveTask, deleteTask,
  addColumn, updateColumn, deleteColumn, shiftColumn,
  addSubtask, toggleSubtask, deleteSubtask, addComment,
  type PmStatus, type PmPriority,
} from '../actions';

export type ProjectInfo = { id: string; name: string; description: string; status: PmStatus; priority: PmPriority; start_date: string; end_date: string; owner_id: string };
export type ColumnRow = { id: string; name: string; color: string; is_done: boolean };
export type SubtaskRow = { id: string; title: string; done: boolean };
export type TaskRow = {
  id: string; title: string; description: string; column_id: string; priority: PmPriority;
  start_date: string; due_date: string; depends_on: string; assignee_ids: string[]; subtasks: SubtaskRow[];
};
export type CommentRow = { id: string; task_id: string | null; author_name: string; body: string; created_at: string };
export type FileRow = { id: string; task_id: string | null; name: string; url: string; created_by: string | null; created_at: string };
export type ActivityRow = { id: string; task_id: string | null; actor_name: string | null; text: string; created_at: string };

const PRIOS: PmPriority[] = ['High', 'Medium', 'Low'];
const PROJECT_STATUSES: PmStatus[] = ['Planning', 'In Progress', 'Completed', 'On Hold'];
const SWATCHES = ['#64748b', '#3563e9', '#0ea5e9', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#e11d48', '#ec4899', '#8b5cf6'];
type Tab = 'tasks' | 'team' | 'notifications';

// Warna kolom -> latar lembut untuk kolom board.
const tint = (hex: string, a = 0.09) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#f1f4fa';
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div className="pm-swatches">
      {SWATCHES.map((c) => (
        <button key={c} type="button" className={value === c ? 'on' : ''} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} />
      ))}
    </div>
  );
}

function ColumnMenu({ col, first, last, onRename, onColor, onToggleDone, onShift, onDelete }: {
  col: ColumnRow; first: boolean; last: boolean; onRename: () => void; onColor: (c: string) => void;
  onToggleDone: () => void; onShift: (d: -1 | 1) => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="pm-dots" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Menu board">⋮</button>
      {open && (
        <div className="pm-menu" style={{ minWidth: 190 }}>
          <button type="button" onClick={() => { setOpen(false); onRename(); }}><i className="fi fi-rr-pencil" /> Ubah nama board</button>
          <div style={{ padding: '6px 10px' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>Warna board</div>
            <Swatches value={col.color} onPick={(c) => onColor(c)} />
          </div>
          <button type="button" onClick={() => { setOpen(false); onToggleDone(); }}><i className="fi fi-rr-check" /> {col.is_done ? 'Bukan board selesai' : 'Tandai sebagai board selesai'}</button>
          {!first && <button type="button" onClick={() => { setOpen(false); onShift(-1); }}><i className="fi fi-rr-arrow-left" /> Geser ke kiri</button>}
          {!last && <button type="button" onClick={() => { setOpen(false); onShift(1); }}><i className="fi fi-rr-arrow-right" /> Geser ke kanan</button>}
          <button type="button" className="danger" onClick={() => { setOpen(false); onDelete(); }}><i className="fi fi-rr-trash" /> Hapus board</button>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailClient({
  project, columns: initialColumns, tasks: initialTasks, members, memberIds, comments, files, activity,
}: {
  project: ProjectInfo; columns: ColumnRow[]; tasks: TaskRow[]; members: Member[]; memberIds: string[];
  comments: CommentRow[]; files: FileRow[]; activity: ActivityRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('tasks');
  const [columns, setColumns] = useState<ColumnRow[]>(initialColumns);
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [quickCol, setQuickCol] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [editProject, setEditProject] = useState(false);
  const [pf, setPf] = useState<ProjectInfo>(project);
  const [savingP, setSavingP] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  // Tambah / ubah board
  const [boardForm, setBoardForm] = useState<{ id?: string; name: string; color: string } | null>(null);
  const [delCol, setDelCol] = useState<ColumnRow | null>(null);
  const [delTask, setDelTask] = useState<TaskRow | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);
  useEffect(() => { setColumns(initialColumns); }, [initialColumns]);
  useEffect(() => { setPf(project); }, [project]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const colById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const team = memberIds.map((id) => byId.get(id)).filter(Boolean) as Member[];
  const owner = byId.get(project.owner_id);

  const visible = tasks.filter((t) => !q.trim() || t.title.toLowerCase().includes(q.trim().toLowerCase()) || t.description.toLowerCase().includes(q.trim().toLowerCase()));
  const open = tasks.find((t) => t.id === openId) ?? null;
  const today = new Date().toISOString().slice(0, 10);

  function fail(r: { error?: string }) { if (r.error) { toast(r.error, 'error'); return true; } return false; }

  async function onDrop(colId: string) {
    const id = dragId;
    setDragId(null); setOverCol(null);
    if (!id) return;
    const t = tasks.find((x) => x.id === id);
    if (!t || t.column_id === colId) return;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, column_id: colId } : x)));
    const r = await moveTask(project.id, id, colId);
    if (fail(r)) setTasks(initialTasks); else router.refresh();
  }

  // Task muncul seketika (optimistis); penyimpanan ke server berjalan di latar belakang.
  async function quickAdd(colId: string) {
    const title = quickTitle.trim();
    setQuickTitle(''); setQuickCol(null);
    if (!title) return;
    const tmpId = 'tmp-' + Date.now();
    setTasks((prev) => [...prev, { id: tmpId, title, description: '', column_id: colId, priority: 'Medium', start_date: '', due_date: '', depends_on: '', assignee_ids: [], subtasks: [] }]);
    const r = await saveTask({ project_id: project.id, title, column_id: colId, priority: 'Medium', assignee_ids: [] });
    if (r.error) { setTasks((prev) => prev.filter((t) => t.id !== tmpId)); toast(r.error, 'error'); return; }
    router.refresh();
  }

  // Simpan perubahan task dari panel samping.
  async function patch(t: TaskRow, change: Partial<TaskRow>) {
    const n = { ...t, ...change };
    setTasks((prev) => prev.map((x) => (x.id === t.id ? n : x)));
    const r = await saveTask({
      id: n.id, project_id: project.id, title: n.title, description: n.description, column_id: n.column_id, priority: n.priority,
      start_date: n.start_date, due_date: n.due_date, depends_on: n.depends_on || null, assignee_ids: n.assignee_ids,
    });
    if (fail(r)) { setTasks(initialTasks); return; }
    router.refresh();
  }

  async function saveProjectInfo() {
    setSavingP(true);
    try {
      const r = await savePmProject({ ...pf, member_ids: memberIds });
      if (fail(r)) return;
      toast('Project berhasil diperbarui', 'success');
      setEditProject(false);
      router.refresh();
    } finally { setSavingP(false); }
  }

  async function saveBoard() {
    if (!boardForm) return;
    const f = boardForm;
    if (!f.name.trim()) return toast('Nama board wajib diisi.', 'error');
    setBoardForm(null);
    if (f.id) {
      setColumns((prev) => prev.map((c) => (c.id === f.id ? { ...c, name: f.name.trim(), color: f.color } : c)));
      const r = await updateColumn(project.id, f.id, { name: f.name, color: f.color });
      if (fail(r)) setColumns(initialColumns);
    } else {
      const r = await addColumn(project.id, f.name, f.color);
      if (fail(r)) return;
    }
    router.refresh();
  }

  async function recolor(c: ColumnRow, color: string) {
    setColumns((prev) => prev.map((x) => (x.id === c.id ? { ...x, color } : x)));
    const r = await updateColumn(project.id, c.id, { color });
    if (fail(r)) setColumns(initialColumns); else router.refresh();
  }
  async function toggleDone(c: ColumnRow) {
    setColumns((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_done: !c.is_done } : x)));
    const r = await updateColumn(project.id, c.id, { is_done: !c.is_done });
    if (fail(r)) setColumns(initialColumns); else router.refresh();
  }
  async function shift(c: ColumnRow, d: -1 | 1) {
    const r = await shiftColumn(project.id, c.id, d);
    if (!fail(r)) router.refresh();
  }
  async function confirmDeleteColumn() {
    if (!delCol) return;
    setBusy(true);
    try {
      const r = await deleteColumn(project.id, delCol.id);
      if (fail(r)) return;
      toast('Board berhasil dihapus. Task di dalamnya dipindah ke board pertama.', 'success');
      setDelCol(null);
      router.refresh();
    } finally { setBusy(false); }
  }
  async function confirmDeleteTask() {
    if (!delTask) return;
    setBusy(true);
    try {
      const r = await deleteTask(project.id, delTask.id);
      if (fail(r)) return;
      setTasks((prev) => prev.filter((t) => t.id !== delTask.id));
      setOpenId(null); setDelTask(null);
      toast('Task berhasil dihapus', 'success');
      router.refresh();
    } finally { setBusy(false); }
  }

  const subDone = (t: TaskRow) => t.subtasks.filter((s) => s.done).length;

  return (
    <div>
      <button type="button" className="pm-back" onClick={() => router.push('/dashboard/project-management')}>
        <span className="ar"><i className="fi fi-rr-arrow-small-left" /></span>
        <span>All Projects</span>
      </button>

      <div className="pm-head">
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="pm-title">{project.name}</div>
          <div className="pm-sub">{project.description || 'Belum ada deskripsi.'}</div>
          <div className="pm-meta">
            <StatusPill s={project.status} /><PriorityPill p={project.priority} />
            <span className="sep" />
            <span className="it"><i className="fi fi-rr-calendar" /> {fmtDate(project.start_date)} – {fmtDate(project.end_date)}</span>
            {owner && <><span className="sep" /><span className="it"><i className="fi fi-rr-user" /> {owner.name}</span></>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <AvatarStack members={team} size="lg" />
          <div style={{ position: 'relative' }}>
            <button type="button" className="pm-ghost" onClick={() => setAddMemberOpen((v) => !v)}><i className="fi fi-rr-plus" /> Add Member</button>
            {addMemberOpen && (
              <div className="pm-menu" style={{ right: 0, top: 44, minWidth: 220, maxHeight: 260, overflowY: 'auto' }}>
                {members.filter((m) => !memberIds.includes(m.id)).length === 0 && <div className="pm-empty" style={{ padding: 12 }}>Semua anggota sudah ada di tim.</div>}
                {members.filter((m) => !memberIds.includes(m.id)).map((m) => (
                  <button key={m.id} type="button" onClick={async () => { setAddMemberOpen(false); const r = await addProjectMember(project.id, m.id); if (!fail(r)) router.refresh(); }}>
                    <Avatar m={m} /> {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="pm-ghost" style={{ padding: 0, width: 38, justifyContent: 'center' }} title="Pengaturan project" onClick={() => setEditProject(true)}><i className="fi fi-rr-settings" /></button>
        </div>
      </div>

      <div className="pm-tabs">
        {([['tasks', 'Tasks', tasks.length], ['team', 'Team Member', team.length], ['notifications', 'Notifications', activity.length]] as [Tab, string, number][]).map(([k, label, n]) => (
          <button key={k} type="button" className={`pm-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label} <span className="n">{n}</span></button>
        ))}
      </div>

      {tab === 'tasks' && (
        <>
          <div className="pm-toolbar">
            <div className="left"><div className="pm-search"><i className="fi fi-rr-search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari task..." /></div></div>
            <div className="right"><button type="button" className="pm-ghost" onClick={() => setBoardForm({ name: '', color: SWATCHES[1] })}><i className="fi fi-rr-plus" /> Tambah Board</button></div>
          </div>
          <div className="pm-board" style={{ gridTemplateColumns: `repeat(${columns.length + 1}, minmax(250px, 1fr))` }}>
            {columns.map((col, ci) => {
              const items = visible.filter((t) => t.column_id === col.id);
              return (
                <div key={col.id} className={`pm-col ${overCol === col.id ? 'over' : ''}`}
                  style={{ background: overCol === col.id ? undefined : tint(col.color), borderTop: `3px solid ${col.color}` }}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
                  onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
                  onDrop={() => onDrop(col.id)}>
                  <div className="pm-col-head">
                    <span className="t"><i className="pm-dot" style={{ background: col.color }} />{col.name}
                      <span className="n" style={{ background: tint(col.color, 0.16), color: col.color }}>{tasks.filter((t) => t.column_id === col.id).length}</span>
                      {col.is_done && <i className="fi fi-rr-check-circle" title="Board selesai" style={{ color: col.color, fontSize: 13 }} />}
                    </span>
                    <span style={{ display: 'inline-flex', gap: 2 }}>
                      <button type="button" title="Tambah task" onClick={() => { setQuickCol(col.id); setQuickTitle(''); }}>+</button>
                      <ColumnMenu col={col} first={ci === 0} last={ci === columns.length - 1}
                        onRename={() => setBoardForm({ id: col.id, name: col.name, color: col.color })}
                        onColor={(c) => recolor(col, c)} onToggleDone={() => toggleDone(col)} onShift={(d) => shift(col, d)} onDelete={() => setDelCol(col)} />
                    </span>
                  </div>
                  {quickCol === col.id && (
                    <div className="pm-task" style={{ cursor: 'default' }}>
                      <input autoFocus className="pm-input" placeholder="Judul task, lalu Enter" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(col.id); if (e.key === 'Escape') { setQuickCol(null); setQuickTitle(''); } }} onBlur={() => quickAdd(col.id)} />
                    </div>
                  )}
                  {items.map((t) => {
                    const asg = t.assignee_ids.map((id) => byId.get(id)).filter(Boolean) as Member[];
                    const done = colById.get(t.column_id)?.is_done;
                    const pct = t.subtasks.length ? (subDone(t) / t.subtasks.length) * 100 : done ? 100 : 0;
                    const od = t.due_date && t.due_date < today && !done;
                    return (
                      <div key={t.id} className={`pm-task ${dragId === t.id ? 'drag' : ''}`} draggable
                        onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                        onClick={() => !t.id.startsWith('tmp-') && setOpenId(t.id)}>
                        <div><PriorityPill p={t.priority} /></div>
                        <div className="tt">{t.title}</div>
                        {t.description && <div className="dd">{t.description}</div>}
                        {asg.length > 0 && <AvatarStack members={asg} max={4} />}
                        <div className="foot">
                          <span className={`ic ${od ? 'od' : ''}`}><i className="fi fi-rr-calendar" /> {t.due_date ? fmtDate(t.due_date) : 'Tanpa due date'}</span>
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <span className="ic"><i className="fi fi-rr-comment" /> {comments.filter((c) => c.task_id === t.id).length}</span>
                          </span>
                        </div>
                        <div className="pm-prog"><div className="lbl"><span>Progress</span><b>{Math.round(pct)}%</b></div><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
                      </div>
                    );
                  })}
                  {items.length === 0 && quickCol !== col.id && <div className="pm-empty">Belum ada task</div>}
                </div>
              );
            })}
            <button type="button" className="pm-col-add" onClick={() => setBoardForm({ name: '', color: SWATCHES[1] })}>
              <i className="fi fi-rr-plus" /> Tambah Board
            </button>
          </div>
        </>
      )}

      {tab === 'team' && (
        <div className="pm-panel">
          {team.length === 0 && <div className="pm-empty">Belum ada anggota. Klik "Add Member" di kanan atas.</div>}
          {team.map((m) => (
            <div key={m.id} className="pm-member">
              <Avatar m={m} />
              <div><div className="nm">{m.name} {m.id === project.owner_id && <span className="pm-badge pm-b-plan" style={{ marginLeft: 6 }}>Owner</span>}</div><div className="rl">{m.role_title || '-'}</div></div>
              <span className="sp" />
              <span style={{ fontSize: 12, color: '#64748b' }}>{tasks.filter((t) => t.assignee_ids.includes(m.id)).length} task</span>
              {m.id !== project.owner_id && (
                <button type="button" className="pm-ghost" style={{ height: 32, padding: '0 12px' }} onClick={async () => { const r = await removeProjectMember(project.id, m.id); if (!fail(r)) router.refresh(); }}>Keluarkan</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="pm-panel pm-feed">
          {activity.length === 0 && <div className="pm-empty">Belum ada aktivitas.</div>}
          {activity.map((a) => (
            <div key={a.id} className="pm-feed-item">
              <Avatar m={{ name: a.actor_name || '?' }} />
              <div><div><b>{a.actor_name || 'Sistem'}</b> {a.text}</div><div className="tm">{fmtDateTime(a.created_at)}</div></div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <TaskDrawer
          key={open.id}
          task={open} tasks={tasks} columns={columns} members={members} team={team} projectId={project.id}
          comments={comments.filter((c) => c.task_id === open.id)}
          activity={activity.filter((a) => a.task_id === open.id)}
          onClose={() => setOpenId(null)} onPatch={(c) => patch(open, c)}
          onDelete={() => setDelTask(open)}
          onChanged={() => router.refresh()} fail={fail}
        />
      )}

      {boardForm && (
        <div className="modal-overlay modal-delete modal-confirm modal-confirm-blue" onClick={(e) => e.target === e.currentTarget && setBoardForm(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3><i className="fi fi-rr-apps-add" /> {boardForm.id ? 'Ubah Board' : 'Tambah Board'}</h3>
              <button type="button" className="modal-close" onClick={() => setBoardForm(null)} aria-label="Tutup">✕</button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <div className="fv2-field">
                <label>Nama Board</label>
                <input autoFocus value={boardForm.name} onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })} placeholder="Contoh: Testing" onKeyDown={(e) => e.key === 'Enter' && saveBoard()} />
              </div>
              <div className="fv2-field" style={{ marginTop: 16 }}>
                <label>Warna</label>
                <Swatches value={boardForm.color} onPick={(c) => setBoardForm({ ...boardForm, color: c })} />
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
              <button type="button" className="btn-secondary" onClick={() => setBoardForm(null)}>Batal</button>
              <button type="button" className="btn-danger" onClick={saveBoard}><i className="fi fi-rr-check" /> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {delCol && <DeleteModal title="Hapus Board" itemName={`${delCol.name} (${tasks.filter((t) => t.column_id === delCol.id).length} task akan dipindah ke board pertama)`} busy={busy} onConfirm={confirmDeleteColumn} onClose={() => setDelCol(null)} />}
      {delTask && <DeleteModal title="Hapus Task" itemName={delTask.title} busy={busy} onConfirm={confirmDeleteTask} onClose={() => setDelTask(null)} />}

      {editProject && (
        <FormModal full title="Pengaturan Project" icon="fa-solid fa-gear" onClose={() => setEditProject(false)}
          footer={<>
            <button type="button" className="btn btn-primary" onClick={saveProjectInfo} disabled={savingP}><i className="fa-solid fa-floppy-disk" /> {savingP ? 'Menyimpan...' : 'Simpan'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditProject(false)}>Batal</button>
          </>}>
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-briefcase" /> Informasi Project</div>
            <div className="fv2-grid cols-1">
              <FvField label="Nama Project" required><input value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} /></FvField>
              <FvField label="Deskripsi"><textarea value={pf.description} onChange={(e) => setPf({ ...pf, description: e.target.value })} /></FvField>
            </div>
            <div className="fv2-grid" style={{ marginTop: 14 }}>
              <FvField label="Status"><FvSelect value={pf.status} onChange={(v) => setPf({ ...pf, status: v as PmStatus })} options={PROJECT_STATUSES.map((s) => ({ value: s, label: s }))} /></FvField>
              <FvField label="Prioritas"><FvSelect value={pf.priority} onChange={(v) => setPf({ ...pf, priority: v as PmPriority })} options={PRIOS.map((s) => ({ value: s, label: s }))} /></FvField>
              <FvField label="Tanggal Mulai"><input type="date" value={pf.start_date} onChange={(e) => setPf({ ...pf, start_date: e.target.value })} /></FvField>
              <FvField label="Tanggal Selesai"><input type="date" value={pf.end_date} onChange={(e) => setPf({ ...pf, end_date: e.target.value })} /></FvField>
              <FvField label="Project Owner"><FvSelect value={pf.owner_id} onChange={(v) => setPf({ ...pf, owner_id: v })} options={members.map((m) => ({ value: m.id, label: m.name }))} placeholder="— Pilih owner —" /></FvField>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function TaskDrawer({
  task, tasks, columns, members, team, projectId, comments, activity, onClose, onPatch, onDelete, onChanged, fail,
}: {
  task: TaskRow; tasks: TaskRow[]; columns: ColumnRow[]; members: Member[]; team: Member[]; projectId: string;
  comments: CommentRow[]; activity: ActivityRow[];
  onClose: () => void; onPatch: (c: Partial<TaskRow>) => void; onDelete: () => void; onChanged: () => void;
  fail: (r: { error?: string }) => boolean;
}) {
  const [sub, setSub] = useState<'subtask' | 'comments' | 'activities'>('subtask');
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [newSub, setNewSub] = useState('');
  const [comment, setComment] = useState('');
  const [pick, setPick] = useState(false);
  const [localSubs, setLocalSubs] = useState(task.subtasks);
  useEffect(() => { setLocalSubs(task.subtasks); }, [task.subtasks]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.modal-overlay')) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const byId = new Map(members.map((m) => [m.id, m]));
  const assignees = task.assignee_ids.map((id) => byId.get(id)).filter(Boolean) as Member[];
  const candidates = (team.length ? team : members).filter((m) => !task.assignee_ids.includes(m.id));
  const others = tasks.filter((t) => t.id !== task.id && !t.id.startsWith('tmp-'));
  const col = columns.find((c) => c.id === task.column_id);

  return (
    <>
      <div className="pm-drawer-ov" onClick={onClose} />
      <aside className="pm-drawer" role="dialog" aria-label="Task Details">
        <div className="pm-drawer-head">
          <div className="x"><button type="button" onClick={onClose} aria-label="Tutup">✕</button> Task Details</div>
          <div className="x"><button type="button" title="Hapus task" onClick={onDelete}><i className="fi fi-rr-trash" /></button></div>
        </div>
        <div className="pm-drawer-body">
          <input className="pm-drawer-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== task.title && onPatch({ title: title.trim() })} />

          <div className="pm-props">
            <span className="k"><i className="fi fi-rr-sun" /> Status</span>
            <div className="pm-sel">
              <Select value={task.column_id} onChange={(e) => onPatch({ column_id: e.target.value })}>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {col && <i className="pm-dot" style={{ background: col.color }} />}
            </div>
            <span className="k"><i className="fi fi-rr-flag" /> Priority</span>
            <div className="pm-sel">
              <Select value={task.priority} onChange={(e) => onPatch({ priority: e.target.value as PmPriority })}>
                {PRIOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <span className="k"><i className="fi fi-rr-calendar" /> Start Date</span>
            <div><input type="date" className="pm-date" value={task.start_date} onChange={(e) => onPatch({ start_date: e.target.value })} /></div>
            <span className="k"><i className="fi fi-rr-calendar-clock" /> Due Date</span>
            <div><input type="date" className="pm-date" value={task.due_date} onChange={(e) => onPatch({ due_date: e.target.value })} /></div>
            <span className="k"><i className="fi fi-rr-link" /> Dependencies</span>
            <div className="pm-sel">
              <Select value={task.depends_on} onChange={(e) => onPatch({ depends_on: e.target.value })}>
                <option value="">Tidak ada</option>
                {others.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
            </div>
            <span className="k"><i className="fi fi-rr-users" /> Assignee</span>
            <div className="pm-chips">
              {assignees.map((m) => (
                <span key={m.id} className="pm-who"><Avatar m={m} /> {m.name}<button type="button" onClick={() => onPatch({ assignee_ids: task.assignee_ids.filter((x) => x !== m.id) })}>✕</button></span>
              ))}
              <div style={{ position: 'relative' }}>
                <button type="button" className="pm-pill-btn" onClick={() => setPick((v) => !v)}>+</button>
                {pick && (
                  <div className="pm-menu" style={{ left: 0, right: 'auto', maxHeight: 220, overflowY: 'auto', minWidth: 200 }}>
                    {candidates.length === 0 && <div className="pm-empty" style={{ padding: 10 }}>Tidak ada anggota lagi.</div>}
                    {candidates.map((m) => <button key={m.id} type="button" onClick={() => { setPick(false); onPatch({ assignee_ids: [...task.assignee_ids, m.id] }); }}><Avatar m={m} /> {m.name}</button>)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pm-sec-t">Description</div>
          <textarea className="pm-text" value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== task.description && onPatch({ description: desc })} placeholder="Tulis deskripsi task..." />

          <div className="pm-sub-tabs">
            {([['subtask', 'Subtask', localSubs.length], ['comments', 'Comments', comments.length], ['activities', 'Activities', activity.length]] as ['subtask' | 'comments' | 'activities', string, number][]).map(([k, l, n]) => (
              <button key={k} type="button" className={`pm-tab ${sub === k ? 'on' : ''}`} onClick={() => setSub(k)}>{l} <span className="n">{n}</span></button>
            ))}
          </div>

          {sub === 'subtask' && (
            <div style={{ marginTop: 12 }}>
              {localSubs.map((s) => (
                <div key={s.id} className={`pm-sub-row ${s.done ? 'done' : ''}`}>
                  <input type="checkbox" checked={s.done} onChange={async (e) => {
                    const v = e.target.checked;
                    setLocalSubs((p) => p.map((x) => (x.id === s.id ? { ...x, done: v } : x)));
                    const r = await toggleSubtask(projectId, s.id, v); if (!fail(r)) onChanged();
                  }} />
                  <span className="tx">{s.title}</span>
                  <button type="button" className="del" onClick={async () => { const r = await deleteSubtask(projectId, s.id); if (!fail(r)) onChanged(); }}><i className="fi fi-rr-cross-small" /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input className="pm-input" value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Subtask baru..."
                  onKeyDown={async (e) => { if (e.key === 'Enter' && newSub.trim()) { const r = await addSubtask(projectId, task.id, newSub); if (!fail(r)) { setNewSub(''); onChanged(); } } }} />
                <button type="button" className="pm-pill-btn" onClick={async () => { const r = await addSubtask(projectId, task.id, newSub); if (!fail(r)) { setNewSub(''); onChanged(); } }}>+ New Subtask</button>
              </div>
            </div>
          )}

          {sub === 'comments' && (
            <div style={{ marginTop: 12 }}>
              {comments.length === 0 && <div className="pm-empty">Belum ada komentar.</div>}
              {comments.map((c) => <div key={c.id} className="pm-comment"><span className="who">{c.author_name}</span><span className="when">{fmtDateTime(c.created_at)}</span><div className="tx">{c.body}</div></div>)}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input className="pm-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tulis komentar..."
                  onKeyDown={async (e) => { if (e.key === 'Enter' && comment.trim()) { const r = await addComment(projectId, task.id, comment); if (!fail(r)) { setComment(''); onChanged(); } } }} />
                <button type="button" className="pm-primary" onClick={async () => { const r = await addComment(projectId, task.id, comment); if (!fail(r)) { setComment(''); onChanged(); } }}>Kirim</button>
              </div>
            </div>
          )}

          {sub === 'activities' && (
            <div className="pm-feed" style={{ marginTop: 8 }}>
              {activity.length === 0 && <div className="pm-empty">Belum ada aktivitas.</div>}
              {activity.map((a) => (
                <div key={a.id} className="pm-feed-item"><Avatar m={{ name: a.actor_name || '?' }} /><div><div><b>{a.actor_name || 'Sistem'}</b> {a.text}</div><div className="tm">{fmtDateTime(a.created_at)}</div></div></div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
