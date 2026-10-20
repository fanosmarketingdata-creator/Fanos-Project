import { createClient } from '@/lib/supabase/server';
import ClassificationsTable, { type ClassificationRow } from './ClassificationsTable';

export default async function ProjectClassificationsPage() {
  const supabase = createClient();
  const { data } = await supabase.from('project_classifications').select('id, name').order('created_at');
  return <ClassificationsTable initialRows={(data ?? []) as ClassificationRow[]} />;
}
