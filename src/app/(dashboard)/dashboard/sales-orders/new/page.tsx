import { createClient } from '@/lib/supabase/server';
import SalesOrderForm from '../SalesOrderForm';

export default async function NewSalesOrderPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: products }, { data: boqProjects }] = await Promise.all([
    supabase.from('clients').select('id, project_name').order('project_name'),
    supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
    supabase.from('boq_projects').select('id, project_name').order('boq_date', { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-shopping-cart" />Tambah Sales Order</h1>
      <p className="mb-6 text-sm text-slate-500">Manual atau langsung dari BOQ Project.</p>
      <SalesOrderForm clients={clients ?? []} products={products ?? []} boqProjects={boqProjects ?? []} />
    </div>
  );
}
