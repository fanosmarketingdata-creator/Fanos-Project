import { createClient } from '@/lib/supabase/server';
import { getDefaultWarehouseId } from '@/lib/stock';
import NewAdjustmentForm from './NewAdjustmentForm';

export default async function NewAdjustmentPage() {
  const supabase = createClient();
  const [{ data: whs }, { data: products }, { data: stock }, def] = await Promise.all([
    supabase.from('warehouses').select('id, name').eq('is_active', true).order('created_at'),
    supabase.from('products').select('id, sku, name, uom, image_url, brand, category, price, cost_price').eq('is_active', true).order('sku'),
    supabase.from('v_current_stock').select('warehouse_id, sku, qty'),
    getDefaultWarehouseId(supabase),
  ]);
  const stockRows = (stock ?? []).map((s) => ({ wh: s.warehouse_id as string, sku: s.sku as string, qty: Number(s.qty) }));
  return <NewAdjustmentForm warehouses={whs ?? []} products={products ?? []} stock={stockRows} defaultWarehouse={def ?? ''} />;
}
