import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ensureColumns } from '../actions';
import ProjectDetailClient, { type ColumnRow, type TaskRow, type CommentRow, type FileRow, type ActivityRow, type ProjectInfo } from './ProjectDetailClient';
import type { Member } from '../pm-ui';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const id = params.id;
  await ensureColumns(id);
  const [{ data: p }, { data: tasks }, { data: subs }, { data: asg }, { data: pmm }, { data: tm }, { data: prof }, { data: comments }, { data: files }, { data: acts }, { data: cols }] = await Promise.all([
    supabase.from('pm_projects').select('id, name, description, status, priority, start_date, end_date, owner_id').eq('id', id).single(),
    supabase.from('pm_tasks').select('id, title, description, status, column_id, priority, start_date, due_date, depends_on, sort_order').eq('project_id', id).order('sort_order'),
    supabase.from('pm_subtasks').select('id, task_id, title, done, sort_order, pm_tasks!inner(project_id)').eq('pm_tasks.project_id', id).order('sort_order'),
    supabase.from('pm_task_assignees').select('task_id, team_member_id, pm_tasks!inner(project_id)').eq('pm_tasks.project_id', id),
    supabase.from('pm_project_members').select('team_member_id').eq('project_id', id),
    supabase.from('team_members').select('id, name, role_title').order('name'),
    supabase.from('profiles').select('team_member_id, photo_url').not('team_member_id', 'is', null),
    supabase.from('pm_comments').select('id, task_id, author_name, body, created_at').eq('project_id', id).order('created_at'),
    supabase.from('pm_files').select('id, task_id, name, url, created_by, created_at').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('pm_activity').select('id, task_id, actor_name, text, created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(200),
    supabase.from('pm_columns').select('id, name, color, is_done, sort_order').eq('project_id', id).order('sort_order'),
  ]);
  if (!p) notFound();

  const photo = new Map((prof ?? []).map((x) => [x.team_member_id as string, x.photo_url as string | null]));
  const members: Member[] = (tm ?? []).map((m) => ({ id: m.id as string, name: m.name as string, role_title: (m.role_title as string | null) ?? null, photo_url: photo.get(m.id as string) ?? null }));

  const taskRows: TaskRow[] = (tasks ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string | null) ?? '',
    column_id: (t.column_id as string | null) ?? '',
    priority: t.priority as TaskRow['priority'],
    start_date: (t.start_date as string | null) ?? '',
    due_date: (t.due_date as string | null) ?? '',
    depends_on: (t.depends_on as string | null) ?? '',
    assignee_ids: (asg ?? []).filter((a) => a.task_id === t.id).map((a) => a.team_member_id as string),
    subtasks: (subs ?? []).filter((s) => s.task_id === t.id).map((s) => ({ id: s.id as string, title: s.title as string, done: !!s.done })),
  }));

  const info: ProjectInfo = {
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string | null) ?? '',
    status: p.status as ProjectInfo['status'],
    priority: p.priority as ProjectInfo['priority'],
    start_date: (p.start_date as string | null) ?? '',
    end_date: (p.end_date as string | null) ?? '',
    owner_id: (p.owner_id as string | null) ?? '',
  };

  return (
    <ProjectDetailClient
      project={info}
      tasks={taskRows}
      columns={(cols ?? []) as ColumnRow[]}
      members={members}
      memberIds={(pmm ?? []).map((m) => m.team_member_id as string)}
      comments={(comments ?? []) as CommentRow[]}
      files={(files ?? []) as FileRow[]}
      activity={(acts ?? []) as ActivityRow[]}
    />
  );
}
