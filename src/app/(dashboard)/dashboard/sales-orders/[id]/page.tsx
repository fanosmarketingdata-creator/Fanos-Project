import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SalesOrderForm from '../SalesOrderForm';
import type { SalesOrderInput } from '../actions';

export default async function EditSalesOrderPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: so }, { data: items }, { data: clients }, { data: products }, { data: boqProjects }] =
    await Promise.all([
      supabase.from('sales_orders').select('*').eq('id', params.id).single(),
      supabase
        .from('sales_order_items')
        .select('product_id, sku, qty, unit_price, notes')
        .eq('sales_order_id', params.id)
        .order('sort_order'),
      supabase.from('clients').select('id, project_name').order('project_name'),
      supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
      supabase.from('boq_projects').select('id, project_name').order('boq_date', { ascending: false }),
    ]);

  if (!so) notFound();
  if (so.status !== 'DRAFT') notFound(); // hanya DRAFT yang bisa diedit (sudah ada pengiriman -> tidak boleh ubah item)

  const initial: SalesOrderInput & { id: string } = {
    id: so.id,
    mode: so.source_type === 'boq' ? 'boq' : 'manual',
    so_date: so.so_date,
    boq_project_id: so.boq_project_id,
    client_id: so.client_id,
    discounts: so.discounts ?? [],
    charges: so.charges ?? [],
    global_notes: so.global_notes ?? '',
    items: (items ?? []).map((it) => ({
      product_id: it.product_id,
      sku: it.sku,
      qty: Number(it.qty),
      unit_price: Number(it.unit_price),
      notes: it.notes ?? '',
    })),
  };

  return (
    <SalesOrderForm clients={clients ?? []} products={products ?? []} boqProjects={boqProjects ?? []} initial={initial} />
  );
}
