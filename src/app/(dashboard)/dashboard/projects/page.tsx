import { createClient } from '@/lib/supabase/server';
import ProjectsTable, { type ProjectRow } from './ProjectsTable';

export default async function ProjectsPage() {
  const supabase = createClient();
  const [{ data: projects }, { data: clients }, { data: classes }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, project_no, name, location, classification, project_type, client_id, client_company, client_name, trigger_source, triggered_by, top, cashback')
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company, contact_name').order('company'),
    supabase.from('project_classifications').select('name').order('created_at'),
  ]);

  return (
    <div>
      <ProjectsTable
        initialProjects={(projects ?? []) as ProjectRow[]}
        classifications={(classes ?? []).map((c) => c.name as string)}
        clients={(clients ?? []) as { id: string; company: string; contact_name: string | null }[]}
      />
    </div>
  );
}
