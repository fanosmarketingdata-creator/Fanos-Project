'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { FormModal, FvField } from '@/components/registry/RegistryModal';
import FvSelect from '@/components/registry/FvSelect';
import { Avatar, AvatarStack, StatusPill, PriorityPill, fmtDate, fmtDateTime, type Member } from '../pm-ui';
import {
  savePmProject, addProjectMember, removeProjectMember, saveTask, moveTask, deleteTask,
  addSubtask, toggleSubtask, deleteSubtask, addComment, addFile, deleteFile,
  type PmStatus, type PmPriority, type TaskStatus,
} from '../actions';

export type ProjectInfo = { id: string; name: string; description: string; status: PmStatus; priority: PmPriority; start_date: string; end_date: string; owner_id: string };
export type SubtaskRow = { id: string; title: string; done: boolean };
export type TaskRow = {
  id: string; title: string; description: string; status: TaskStatus; priority: PmPriority;
  start_date: string; due_date: string; depends_on: string; assignee_ids: string[]; subtasks: SubtaskRow[];
};
export type CommentRow = { id: string; task_id: string | null; author_name: string; body: string; created_at: string };
export type FileRow = { id: string; task_id: string | null; name: string; url: string; created_by: string | null; created_at: string };
export type ActivityRow = { id: string; task_id: string | null; actor_name: string | null; text: string; created_at: string };

const COLUMNS: TaskStatus[] = ['To-Do', 'In Progress', 'Review', 'Completed'];
const PRIOS: PmPriority[] = ['High', 'Medium', 'Low'];
const PROJECT_STATUSES: PmStatus[] = ['Planning', 'In Progress', 'Completed', 'On Hold'];
type Tab = 'tasks' | 'discussion' | 'team' | 'notifications' | 'files';

export default function ProjectDetailClient({
  project, tasks: initialTasks, members, memberIds, comments, files, activity,
}: {
  project: ProjectInfo; tasks: TaskRow[]; members: Member[]; memberIds: string[];
  comments: CommentRow[]; files: FileRow[]; activity: ActivityRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [quickCol, setQuickCol] = useState<TaskStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [editProject, setEditProject] = useState(false);
  const [pf, setPf] = useState<ProjectInfo>(project);
  const [savingP, setSavingP] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [discussion, setDiscussion] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);
  useEffect(() => { setPf(project); }, [project]);

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const team = memberIds.map((id) => byId.get(id)).filter(Boolean) as Member[];
  const owner = byId.get(project.owner_id);
  const projectComments = comments.filter((c) => !c.task_id);
  const projectFiles = files;

  const visible = tasks.filter((t) => !q.trim() || t.title.toLowerCase().includes(q.trim().toLowerCase()) || t.description.toLowerCase().includes(q.trim().toLowerCase()));
  const open = tasks.find((t) => t.id === openId) ?? null;
  const today = new Date().toISOString().slice(0, 10);

  function fail(r: { error?: string }) { if (r.error) { toast(r.error, 'error'); return true; } return false; }

  async function onDrop(col: TaskStatus) {
    const id = dragId;
    setDragId(null); setOverCol(null);
    if (!id) return;
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === col) return;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status: col } : x)));
    const r = await moveTask(project.id, id, col);
    if (fail(r)) setTasks(initialTasks); else router.refresh();
  }

  async function quickAdd(col: TaskStatus) {
    const title = quickTitle.trim();
    if (!title) { setQuickCol(null); return; }
    const r = await saveTask({ project_id: project.id, title, status: col, priority: 'Medium', assignee_ids: [] });
    if (fail(r)) return;
    setQuickTitle(''); setQuickCol(null);
    router.refresh();
  }

  // Simpan perubahan task dari panel samping.
  async function patch(t: TaskRow, change: Partial<TaskRow>) {
    const n = { ...t, ...change };
    setTasks((prev) => prev.map((x) => (x.id === t.id ? n : x)));
    const r = await saveTask({
      id: n.id, project_id: project.id, title: n.title, description: n.description, status: n.status, priority: n.priority,
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

  const subDone = (t: TaskRow) => t.subtasks.filter((s) => s.done).length;

  return (
    <div>
      <button type="button" className="pm-back" onClick={() => router.push('/dashboard/project-management')}><i className="fi fi-rr-arrow-left" /> Kembali ke All Projects</button>

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
        {([
          ['tasks', 'Tasks', tasks.length], ['discussion', 'Discussion', projectComments.length], ['team', 'Team Member', team.length],
          ['notifications', 'Notifications', activity.length], ['files', 'Files', projectFiles.length],
        ] as [Tab, string, number][]).map(([k, label, n]) => (
          <button key={k} type="button" className={`pm-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{label} <span className="n">{n}</span></button>
        ))}
      </div>

      {tab === 'tasks' && (
        <>
          <div className="pm-toolbar">
            <div className="left"><div className="pm-search"><i className="fi fi-rr-search" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari task..." /></div></div>
          </div>
          <div className="pm-board">
            {COLUMNS.map((col) => {
              const items = visible.filter((t) => t.status === col);
              return (
                <div key={col} className={`pm-col ${overCol === col ? 'over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
                  onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
                  onDrop={() => onDrop(col)}>
                  <div className="pm-col-head">
                    <span className="t">{col} <span className="n">{tasks.filter((t) => t.status === col).length}</span></span>
                    <button type="button" title="Tambah task" onClick={() => { setQuickCol(col); setQuickTitle(''); }}>+</button>
                  </div>
                  {quickCol === col && (
                    <div className="pm-task" style={{ cursor: 'default' }}>
                      <input autoFocus className="pm-input" placeholder="Judul task, lalu Enter" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(col); if (e.key === 'Escape') setQuickCol(null); }} onBlur={() => quickAdd(col)} />
                    </div>
                  )}
                  {items.map((t) => {
                    const asg = t.assignee_ids.map((id) => byId.get(id)).filter(Boolean) as Member[];
                    const pct = t.subtasks.length ? (subDone(t) / t.subtasks.length) * 100 : t.status === 'Completed' ? 100 : 0;
                    const od = t.due_date && t.due_date < today && t.status !== 'Completed';
                    return (
                      <div key={t.id} className={`pm-task ${dragId === t.id ? 'drag' : ''}`} draggable
                        onDragStart={() => setDragId(t.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                        onClick={() => setOpenId(t.id)}>
                        <div><PriorityPill p={t.priority} /></div>
                        <div className="tt">{t.title}</div>
                        {t.description && <div className="dd">{t.description}</div>}
                        {asg.length > 0 && <AvatarStack members={asg} max={4} />}
                        <div className="foot">
                          <span className={`ic ${od ? 'od' : ''}`}><i className="fi fi-rr-calendar" /> {t.due_date ? fmtDate(t.due_date) : 'Tanpa due date'}</span>
                          <span style={{ display: 'inline-flex', gap: 6 }}>
                            <span className="ic"><i className="fi fi-rr-link" /> {files.filter((f) => f.task_id === t.id).length}</span>
                            <span className="ic"><i className="fi fi-rr-comment" /> {comments.filter((c) => c.task_id === t.id).length}</span>
                          </span>
                        </div>
                        <div className="pm-prog"><div className="lbl"><span>Progress</span><b>{Math.round(pct)}%</b></div><div className="bar"><i style={{ width: `${pct}%` }} /></div></div>
                      </div>
                    );
                  })}
                  {items.length === 0 && quickCol !== col && <div className="pm-empty">Belum ada task</div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'discussion' && (
        <div className="pm-panel">
          {projectComments.length === 0 && <div className="pm-empty">Belum ada diskusi. Mulai percakapan pertama.</div>}
          {projectComments.map((c) => (
            <div key={c.id} className="pm-comment"><span className="who">{c.author_name}</span><span className="when">{fmtDateTime(c.created_at)}</span><div className="tx">{c.body}</div></div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input className="pm-input" value={discussion} onChange={(e) => setDiscussion(e.target.value)} placeholder="Tulis pesan..."
              onKeyDown={async (e) => { if (e.key === 'Enter' && discussion.trim()) { const r = await addComment(project.id, null, discussion); if (!fail(r)) { setDiscussion(''); router.refresh(); } } }} />
            <button type="button" className="pm-primary" onClick={async () => { const r = await addComment(project.id, null, discussion); if (!fail(r)) { setDiscussion(''); router.refresh(); } }}>Kirim</button>
          </div>
        </div>
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

      {tab === 'files' && (
        <div className="pm-panel">
          {projectFiles.length === 0 && <div className="pm-empty">Belum ada file. Tambahkan tautan dokumen di bawah.</div>}
          {projectFiles.map((f) => (
            <div key={f.id} className="pm-file">
              <div className="ic"><i className="fi fi-rr-document" /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a className="nm" href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
                <div className="sb">{f.url}</div>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{f.created_by} · {fmtDateTime(f.created_at)}</span>
              <button type="button" className="pm-ghost" style={{ height: 30, padding: '0 10px' }} onClick={async () => { const r = await deleteFile(project.id, f.id); if (!fail(r)) router.refresh(); }}><i className="fi fi-rr-trash" /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <input className="pm-input" style={{ flex: '1 1 180px' }} value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="Nama file" />
            <input className="pm-input" style={{ flex: '2 1 260px' }} value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://tautan-file..." />
            <button type="button" className="pm-primary" onClick={async () => { const r = await addFile(project.id, null, fileName, fileUrl); if (!fail(r)) { setFileName(''); setFileUrl(''); router.refresh(); } }}><i className="fi fi-rr-plus" /> Tambah</button>
          </div>
        </div>
      )}

      {open && (
        <TaskDrawer
          key={open.id}
          task={open} tasks={tasks} members={members} team={team} projectId={project.id}
          comments={comments.filter((c) => c.task_id === open.id)} files={files.filter((f) => f.task_id === open.id)}
          activity={activity.filter((a) => a.task_id === open.id)}
          onClose={() => setOpenId(null)} onPatch={(c) => patch(open, c)}
          onDelete={async () => { const r = await deleteTask(project.id, open.id); if (!fail(r)) { setOpenId(null); router.refresh(); toast('Task dihapus', 'success'); } }}
          onChanged={() => router.refresh()} fail={fail}
        />
      )}

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
  task, tasks, members, team, projectId, comments, files, activity, onClose, onPatch, onDelete, onChanged, fail,
}: {
  task: TaskRow; tasks: TaskRow[]; members: Member[]; team: Member[]; projectId: string;
  comments: CommentRow[]; files: FileRow[]; activity: ActivityRow[];
  onClose: () => void; onPatch: (c: Partial<TaskRow>) => void; onDelete: () => void; onChanged: () => void;
  fail: (r: { error?: string }) => boolean;
}) {
  const [sub, setSub] = useState<'subtask' | 'comments' | 'activities'>('subtask');
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [newSub, setNewSub] = useState('');
  const [comment, setComment] = useState('');
  const [fName, setFName] = useState('');
  const [fUrl, setFUrl] = useState('');
  const [showFile, setShowFile] = useState(false);
  const [pick, setPick] = useState(false);
  const [localSubs, setLocalSubs] = useState(task.subtasks);
  useEffect(() => { setLocalSubs(task.subtasks); }, [task.subtasks]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const byId = new Map(members.map((m) => [m.id, m]));
  const assignees = task.assignee_ids.map((id) => byId.get(id)).filter(Boolean) as Member[];
  const candidates = (team.length ? team : members).filter((m) => !task.assignee_ids.includes(m.id));
  const others = tasks.filter((t) => t.id !== task.id);

  return (
    <>
      <div className="pm-drawer-ov" onClick={onClose} />
      <aside className="pm-drawer" role="dialog" aria-label="Task Details">
        <div className="pm-drawer-head">
          <div className="x"><button type="button" onClick={onClose} aria-label="Tutup">✕</button> Task Details</div>
          <div className="x"><button type="button" title="Hapus task" onClick={() => { if (window.confirm('Hapus task ini?')) onDelete(); }}><i className="fi fi-rr-trash" /></button></div>
        </div>
        <div className="pm-drawer-body">
          <input className="pm-drawer-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== task.title && onPatch({ title: title.trim() })} />

          <div className="pm-props">
            <span className="k"><i className="fi fi-rr-sun" /> Status</span>
            <div><select value={task.status} onChange={(e) => onPatch({ status: e.target.value as TaskStatus })}>{COLUMNS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <span className="k"><i className="fi fi-rr-flag" /> Priority</span>
            <div><select value={task.priority} onChange={(e) => onPatch({ priority: e.target.value as PmPriority })}>{PRIOS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <span className="k"><i className="fi fi-rr-calendar" /> Start Date</span>
            <div><input type="date" value={task.start_date} onChange={(e) => onPatch({ start_date: e.target.value })} /></div>
            <span className="k"><i className="fi fi-rr-calendar-clock" /> Due Date</span>
            <div><input type="date" value={task.due_date} onChange={(e) => onPatch({ due_date: e.target.value })} /></div>
            <span className="k"><i className="fi fi-rr-link" /> Dependencies</span>
            <div>
              <select value={task.depends_on} onChange={(e) => onPatch({ depends_on: e.target.value })}>
                <option value="">Tidak ada</option>
                {others.map((t) => <option key={t.id} value={t.id}>Blocked by: {t.title}</option>)}
              </select>
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

          <div className="pm-sec-t">
            <span>Attachments <span className="n pm-badge pm-b-plan">{files.length}</span></span>
            <button type="button" className="pm-pill-btn" onClick={() => setShowFile((v) => !v)}><i className="fi fi-rr-plus" /> Add Attachments</button>
          </div>
          {showFile && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <input className="pm-input" style={{ flex: '1 1 140px' }} value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nama file" />
              <input className="pm-input" style={{ flex: '2 1 200px' }} value={fUrl} onChange={(e) => setFUrl(e.target.value)} placeholder="https://..." />
              <button type="button" className="pm-primary" onClick={async () => { const r = await addFile(projectId, task.id, fName, fUrl); if (!fail(r)) { setFName(''); setFUrl(''); setShowFile(false); onChanged(); } }}>Simpan</button>
            </div>
          )}
          {files.map((f) => (
            <div key={f.id} className="pm-file">
              <div className="ic"><i className="fi fi-rr-document" /></div>
              <div style={{ flex: 1, minWidth: 0 }}><a className="nm" href={f.url} target="_blank" rel="noreferrer">{f.name}</a><div className="sb">{f.url}</div></div>
              <button type="button" className="pm-ghost" style={{ height: 30, padding: '0 10px' }} onClick={async () => { const r = await deleteFile(projectId, f.id); if (!fail(r)) onChanged(); }}><i className="fi fi-rr-trash" /></button>
            </div>
          ))}

          <div className="pm-sub-tabs">
            {([['subtask', `Subtask`, localSubs.length], ['comments', 'Comments', comments.length], ['activities', 'Activities', activity.length]] as ['subtask' | 'comments' | 'activities', string, number][]).map(([k, l, n]) => (
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
