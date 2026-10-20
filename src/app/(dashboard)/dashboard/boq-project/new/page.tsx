import { createClient } from '@/lib/supabase/server';
import BOQProjectForm from '../BOQProjectForm';

export default async function NewBOQProjectPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: products }] = await Promise.all([
    supabase.from('clients').select('id, project_name').order('project_name'),
    supabase.from('products').select('id, sku, name, uom, image_url, brand, category').eq('is_active', true).order('sku'),
  ]);

  return (
    <BOQProjectForm clients={clients ?? []} products={products ?? []} />
  );
}
