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
      <h1 className="mb-1 text-xl font-bold text-slate-800">Products</h1>
      <p className="mb-6 text-sm text-slate-500">Katalog produk & harga.</p>
      <ProductsTable initialProducts={products ?? []} />
    </div>
  );
}
