import { createClient } from '@/lib/supabase/server';
import { getUninvoicedSalesOrders } from '../actions';
import NewInvoiceForm from './NewInvoiceForm';

export default async function NewInvoicePage() {
  const supabase = createClient();
  const [sos, { data: products }] = await Promise.all([
    getUninvoicedSalesOrders(),
    supabase.from('products').select('id, sku, name, uom, image_url, brand, category, price, cost_price').eq('is_active', true).eq('price_listed', true).order('sku'),
  ]);

  return <NewInvoiceForm salesOrders={sos} products={products ?? []} />;
}
