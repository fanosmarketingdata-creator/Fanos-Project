import { createClient } from '@/lib/supabase/server';
import ProjectListClient, { type PmProjectRow } from './ProjectListClient';
import type { Member } from './pm-ui';

export default async function ProjectManagementPage() {
  const supabase = createClient();
  const [{ data: projects }, { data: tasks }, { data: pmm }, { data: tm }, { data: prof }, { data: cols }] = await Promise.all([
    supabase.from('pm_projects').select('id, name, description, status, priority, start_date, end_date, owner_id, created_at').order('created_at', { ascending: false }),
    supabase.from('pm_tasks').select('project_id, status, column_id'),
    supabase.from('pm_project_members').select('project_id, team_member_id'),
    supabase.from('team_members').select('id, name, role_title').order('name'),
    supabase.from('profiles').select('team_member_id, photo_url').not('team_member_id', 'is', null),
    supabase.from('pm_columns').select('id, is_done'),
  ]);
  const doneCols = new Set((cols ?? []).filter((c) => c.is_done).map((c) => c.id as string));
  const photo = new Map((prof ?? []).map((p) => [p.team_member_id as string, p.photo_url as string | null]));
  const members: Member[] = (tm ?? []).map((m) => ({ id: m.id as string, name: m.name as string, role_title: (m.role_title as string | null) ?? null, photo_url: photo.get(m.id as string) ?? null }));
  const byId = new Map(members.map((m) => [m.id, m]));

  const rows: PmProjectRow[] = (projects ?? []).map((p) => {
    const t = (tasks ?? []).filter((x) => x.project_id === p.id);
    return {
      id: p.id as string,
      name: p.name as string,
      description: (p.description as string | null) ?? '',
      status: p.status as PmProjectRow['status'],
      priority: p.priority as PmProjectRow['priority'],
      start_date: (p.start_date as string | null) ?? '',
      end_date: (p.end_date as string | null) ?? '',
      owner_id: (p.owner_id as string | null) ?? '',
      created_at: p.created_at as string,
      task_total: t.length,
      task_done: t.filter((x) => (x.column_id ? doneCols.has(x.column_id as string) : x.status === 'Completed')).length,
      member_ids: (pmm ?? []).filter((x) => x.project_id === p.id).map((x) => x.team_member_id as string).filter((id) => byId.has(id)),
    };
  });

  return <ProjectListClient rows={rows} members={members} />;
}
