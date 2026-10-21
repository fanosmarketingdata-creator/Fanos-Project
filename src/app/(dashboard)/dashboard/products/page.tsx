import { createClient } from '@/lib/supabase/server';
import ProductsTable from './ProductsTable';
import { SPEC_KEYS } from './fields';

export default async function ProductsPage() {
  const supabase = createClient();
  const cols = [
    'id', 'sku', 'name', 'brand', 'uom', 'price', 'cost_price', 'image_url',
    'category', 'subcategory', 'application', 'notes', ...SPEC_KEYS,
  ].join(', ');
  const { data: brandRows } = await supabase.from('brands').select('name').order('name');
  const { data: products } = await supabase.from('products').select(cols).order('created_at', { ascending: false });

  return (
    <div>
      <ProductsTable brands={(brandRows ?? []).map((b) => b.name)} initialProducts={(products ?? []) as unknown as import('./ProductsTable').ProductRow[]} />
    </div>
  );
}
