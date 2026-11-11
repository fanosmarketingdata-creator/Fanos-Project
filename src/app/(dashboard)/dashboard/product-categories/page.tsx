import { createClient } from '@/lib/supabase/server';
import CategoriesTable, { type CategoryRow } from './CategoriesTable';
import { orThrow } from '@/lib/query';

export default async function ProductCategoriesPage() {
  const supabase = createClient();
  const [cats, prods] = await Promise.all([
    supabase.from('product_categories').select('id, name, subcategories').order('sort').order('created_at'),
    supabase.from('products').select('category'),
  ]);
  const { data } = orThrow(cats);
  const { data: products } = orThrow(prods);
  const count: Record<string, number> = {};
  for (const p of products ?? []) {
    const c = (p.category as string | null) ?? '';
    if (c) count[c] = (count[c] ?? 0) + 1;
  }
  const rows: CategoryRow[] = (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    subcategories: (c.subcategories as string[] | null) ?? [],
    products: count[c.name as string] ?? 0,
  }));
  return <CategoriesTable initialRows={rows} />;
}
