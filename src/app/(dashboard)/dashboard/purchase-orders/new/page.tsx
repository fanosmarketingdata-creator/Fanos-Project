import { createClient } from '@/lib/supabase/server';
import POForm from '../POForm';

export default async function NewPOPage() {
  const supabase = createClient();
  const [{ data: vendors }, { data: products }, { data: sos }] = await Promise.all([
    supabase.from('vendors').select('id, company').order('company'),
    supabase.from('products').select('id, sku, name, uom, image_url, brand, category, price, cost_price').eq('is_active', true).eq('price_listed', true).order('sku'),
    supabase.from('sales_orders').select('id, doc_no, status, clients(project_name)').in('status', ['VERIFIED', 'ONGOING']).order('so_date', { ascending: false }),
  ]);
  const salesOrders = (sos ?? []).map((o) => {
    const c = o.clients as unknown as { project_name: string } | { project_name: string }[] | null;
    const cn = Array.isArray(c) ? c[0]?.project_name : c?.project_name;
    return { id: o.id as string, label: `${o.doc_no ?? 'SO'} · ${cn ?? '-'} · ${o.status}` };
  });

  return (
    <POForm vendors={vendors ?? []} products={products ?? []} salesOrders={salesOrders} />
  );
}
