import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/fetch-all';
import { getSalesOrdersForDelivery } from '../actions';
import NewDeliveryForm from './NewDeliveryForm';

export default async function NewDeliveryOrderPage() {
  const supabase = createClient();
  const [salesOrders, { data: clients }, { data: products }] = await Promise.all([
    getSalesOrdersForDelivery(),
    fetchAll(() => supabase.from('clients').select('id, project_name').order('project_name')),
    fetchAll(() => supabase.from('products').select('id, sku, name, uom, image_url, brand, category, price, cost_price').eq('is_active', true).eq('price_listed', true).order('sku')),
  ]);
  return <NewDeliveryForm salesOrders={salesOrders} clients={clients ?? []} products={products ?? []} />;
}
