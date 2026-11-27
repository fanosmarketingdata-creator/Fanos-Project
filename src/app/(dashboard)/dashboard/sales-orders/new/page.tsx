import { createClient } from '@/lib/supabase/server';
import { fetchAll } from '@/lib/fetch-all';
import SalesOrderForm from '../SalesOrderForm';
import { toQuoteOptions } from '@/lib/so-quotes';

export const dynamic = 'force-dynamic';

export default async function NewSalesOrderPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: products }, { data: quotes }, { data: usedSO }] = await Promise.all([
    fetchAll(() => supabase.from('clients').select('id, project_name').order('project_name')),
    fetchAll(() => supabase.from('products').select('id, sku, name, uom, image_url, brand, category, price, cost_price').eq('is_active', true).eq('price_listed', true).order('sku')),
    supabase
        .from('quotations')
        .select('id, doc_no, status, total_amount, client_id, clients(project_name)')
                .order('quote_date', { ascending: false }),
      supabase.from('sales_orders').select('quotation_id, doc_no').not('quotation_id', 'is', null),
  ]);

  return (
    <SalesOrderForm clients={clients ?? []} products={products ?? []} quotations={toQuoteOptions(quotes, usedSO)} />
  );
}
