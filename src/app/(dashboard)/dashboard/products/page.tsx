import { createClient } from '@/lib/supabase/server';
import ProductsTable from './ProductsTable';

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, sku, name, brand, uom, price, image_url, category')
    .order('created_at', { ascending: false });

  return (
    <div>
      <ProductsTable initialProducts={products ?? []} />
    </div>
  );
}
