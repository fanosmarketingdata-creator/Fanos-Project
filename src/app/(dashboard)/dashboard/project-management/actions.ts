'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PmStatus = 'Planning' | 'In Progress' | 'Completed' | 'On Hold';
export type PmPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'To-Do' | 'In Progress' | 'Review' | 'Completed';

export type PmProjectInput = {
  id?: string;
  name: string;
  description?: string;
  status: PmStatus;
  priority: PmPriority;
  start_date?: string;
  end_date?: string;
  owner_id?: string;
  member_ids: string[];
};

async function actorName() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Sistem';
  const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  return (data?.full_name as string) || user.email || 'Pengguna';
}

async function log(projectId: string, text: string, taskId?: string | null) {
  const supabase = createClient();
  await supabase.from('pm_activity').insert({ project_id: projectId, task_id: taskId ?? null, actor_name: await actorName(), text });
}

export async function savePmProject(input: PmProjectInput) {
  if (!input.name?.trim()) return { error: 'Nama project wajib diisi.' };
  if (input.start_date && input.end_date && input.end_date < input.start_date) return { error: 'Tanggal selesai tidak boleh sebelum tanggal mulai.' };
  const supabase = createClient();
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    owner_id: input.owner_id || null,
    updated_at: new Date().toISOString(),
  };
  let id = input.id;
  if (id) {
    const { error } = await supabase.from('pm_projects').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from('pm_projects').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data.id as string;
  }
  // Anggota: owner otomatis ikut.
  const ids = Array.from(new Set([...(input.member_ids ?? []), ...(input.owner_id ? [input.owner_id] : [])]));
  await supabase.from('pm_project_members').delete().eq('project_id', id);
  if (ids.length) await supabase.from('pm_project_members').insert(ids.map((m) => ({ project_id: id, team_member_id: m })));
  await log(id!, input.id ? 'memperbarui data project' : 'membuat project');
  revalidatePath('/dashboard/project-management');
  revalidatePath(`/dashboard/project-management/${id}`);
  return { success: true, id };
}

export async function deletePmProject(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('pm_projects').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/project-management');
  return { success: true };
}

export async function addProjectMember(projectId: string, memberId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('pm_project_members').upsert({ project_id: projectId, team_member_id: memberId });
  if (error) return { error: error.message };
  const { data: m } = await supabase.from('team_members').select('name').eq('id', memberId).single();
  await log(projectId, `menambahkan ${m?.name ?? 'anggota'} ke tim`);
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true };
}

export async function removeProjectMember(projectId: string, memberId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('pm_project_members').delete().eq('project_id', projectId).eq('team_member_id', memberId);
  if (error) return { error: error.message };
  await supabase.from('pm_task_assignees').delete().eq('team_member_id', memberId).in('task_id', ((await supabase.from('pm_tasks').select('id').eq('project_id', projectId)).data ?? []).map((t) => t.id as string));
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true };
}

export type TaskInput = {
  id?: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: PmPriority;
  start_date?: string;
  due_date?: string;
  depends_on?: string | null;
  assignee_ids?: string[];
};

export async function saveTask(input: TaskInput) {
  if (!input.title?.trim()) return { error: 'Judul task wajib diisi.' };
  if (input.start_date && input.due_date && input.due_date < input.start_date) return { error: 'Due date tidak boleh sebelum start date.' };
  if (input.id && input.depends_on === input.id) return { error: 'Task tidak boleh bergantung pada dirinya sendiri.' };
  const supabase = createClient();
  const payload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    status: input.status,
    priority: input.priority,
    start_date: input.start_date || null,
    due_date: input.due_date || null,
    depends_on: input.depends_on || null,
    updated_at: new Date().toISOString(),
  };
  let id = input.id;
  if (id) {
    const { data: old } = await supabase.from('pm_tasks').select('status, title').eq('id', id).single();
    const { error } = await supabase.from('pm_tasks').update(payload).eq('id', id);
    if (error) return { error: error.message };
    if (old && old.status !== input.status) await log(input.project_id, `memindahkan "${payload.title}" ke ${input.status}`, id);
  } else {
    const { data: last } = await supabase.from('pm_tasks').select('sort_order').eq('project_id', input.project_id).eq('status', input.status).order('sort_order', { ascending: false }).limit(1);
    const { data, error } = await supabase.from('pm_tasks').insert({ ...payload, project_id: input.project_id, sort_order: ((last?.[0]?.sort_order as number) ?? -1) + 1 }).select('id').single();
    if (error) return { error: error.message };
    id = data.id as string;
    await log(input.project_id, `membuat task "${payload.title}"`, id);
  }
  if (input.assignee_ids) {
    await supabase.from('pm_task_assignees').delete().eq('task_id', id);
    if (input.assignee_ids.length) await supabase.from('pm_task_assignees').insert(input.assignee_ids.map((m) => ({ task_id: id, team_member_id: m })));
  }
  revalidatePath(`/dashboard/project-management/${input.project_id}`);
  return { success: true, id };
}

export async function moveTask(projectId: string, taskId: string, status: TaskStatus) {
  const supabase = createClient();
  const { data: old } = await supabase.from('pm_tasks').select('status, title').eq('id', taskId).single();
  const { error } = await supabase.from('pm_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId);
  if (error) return { error: error.message };
  if (old && old.status !== status) await log(projectId, `memindahkan "${old.title}" ke ${status}`, taskId);
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true };
}

export async function deleteTask(projectId: string, taskId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('pm_tasks').delete().eq('id', taskId);
  if (error) return { error: error.message };
  await log(projectId, 'menghapus sebuah task');
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true };
}

export async function addSubtask(projectId: string, taskId: string, title: string) {
  if (!title.trim()) return { error: 'Judul subtask wajib diisi.' };
  const supabase = createClient();
  const { data: last } = await supabase.from('pm_subtasks').select('sort_order').eq('task_id', taskId).order('sort_order', { ascending: false }).limit(1);
  const { data, error } = await supabase.from('pm_subtasks').insert({ task_id: taskId, title: title.trim(), sort_order: ((last?.[0]?.sort_order as number) ?? -1) + 1 }).select('id').single();
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true, id: data.id as string };
}

export async function toggleSubtask(projectId: string, subtaskId: string, done: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from('pm_subtasks').update({ done }).eq('id', subtaskId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true };
}

export async function deleteSubtask(projectId: string, subtaskId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('pm_subtasks').delete().eq('id', subtaskId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true };
}

export async function addComment(projectId: string, taskId: string | null, body: string) {
  if (!body.trim()) return { error: 'Komentar tidak boleh kosong.' };
  const supabase = createClient();
  const author = await actorName();
  const { data, error } = await supabase.from('pm_comments').insert({ project_id: projectId, task_id: taskId, author_name: author, body: body.trim() }).select('id, created_at').single();
  if (error) return { error: error.message };
  await log(projectId, taskId ? 'mengomentari sebuah task' : 'menulis di diskusi', taskId);
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true, id: data.id as string, created_at: data.created_at as string, author };
}

export async function addFile(projectId: string, taskId: string | null, name: string, url: string) {
  if (!name.trim() || !url.trim()) return { error: 'Nama dan tautan file wajib diisi.' };
  if (!/^https?:\/\//i.test(url.trim())) return { error: 'Tautan harus diawali http:// atau https://' };
  const supabase = createClient();
  const { data, error } = await supabase.from('pm_files').insert({ project_id: projectId, task_id: taskId, name: name.trim(), url: url.trim(), created_by: await actorName() }).select('id').single();
  if (error) return { error: error.message };
  await log(projectId, `menambahkan file "${name.trim()}"`, taskId);
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true, id: data.id as string };
}

export async function deleteFile(projectId: string, fileId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('pm_files').delete().eq('id', fileId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/project-management/${projectId}`);
  return { success: true };
}
