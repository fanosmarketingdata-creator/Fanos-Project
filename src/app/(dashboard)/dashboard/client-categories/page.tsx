import { createClient } from '@/lib/supabase/server';
import CategoriesTable, { type CategoryRow } from './CategoriesTable';
import { orThrow } from '@/lib/query';

export default async function ClientCategoriesPage() {
  const supabase = createClient();
  const { data } = orThrow(await supabase.from('client_categories').select('id, name').order('created_at'));
  return <CategoriesTable initialRows={(data ?? []) as CategoryRow[]} />;
}
