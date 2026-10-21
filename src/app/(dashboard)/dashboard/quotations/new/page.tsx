import { createClient } from '@/lib/supabase/server';
import QuotationForm from '../QuotationForm';

export default async function NewQuotationPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: products }, { data: boqProjects }] = await Promise.all([
    supabase.from('clients').select('id, project_name').order('project_name'),
    supabase.from('products').select('id, sku, name, uom, image_url, brand, category, price, cost_price').eq('is_active', true).eq('price_listed', true).order('sku'),
    supabase.from('boq_projects').select('id, project_name').order('boq_date', { ascending: false }),
  ]);

  return (
    <QuotationForm clients={clients ?? []} products={products ?? []} boqProjects={boqProjects ?? []} />
  );
}
