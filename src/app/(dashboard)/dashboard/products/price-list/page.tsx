import { createClient } from '@/lib/supabase/server';
import { SPEC_KEYS } from '../fields';
import PriceListTable, { type PriceRow } from './PriceListTable';

export default async function PriceListPage() {
  const supabase = createClient();
  const cols = ['id', 'sku', 'name', 'brand', 'uom', 'price', 'cost_price', 'category', 'subcategory', ...SPEC_KEYS].join(', ');
  const { data } = await supabase.from('products').select(cols).order('category').order('sku');
  return <PriceListTable initialRows={(data ?? []) as unknown as PriceRow[]} />;
}
