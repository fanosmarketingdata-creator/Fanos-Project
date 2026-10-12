import { createClient } from '@/lib/supabase/server';
import BOQProjectForm from '../BOQProjectForm';

export default async function NewBOQProjectPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: products }] = await Promise.all([
    supabase.from('clients').select('id, project_name').order('project_name'),
    supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Tambah BOQ Project</h1>
      <p className="mb-6 text-sm text-slate-500">Susun Area → Sub-area → Item untuk proyek ini.</p>
      <BOQProjectForm clients={clients ?? []} products={products ?? []} />
    </div>
  );
}
