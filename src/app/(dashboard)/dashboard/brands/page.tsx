import { createClient } from '@/lib/supabase/server';
import BrandsTable, { type BrandRow } from './BrandsTable';

export default async function BrandsPage() {
  const supabase = createClient();
  const [{ data: brands }, { data: products }] = await Promise.all([
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('products').select('brand'),
  ]);
  const usage = new Map<string, number>();
  (products ?? []).forEach((p) => p.brand && usage.set(p.brand, (usage.get(p.brand) ?? 0) + 1));
  const rows: BrandRow[] = (brands ?? []).map((b) => ({ id: b.id, name: b.name, product_count: usage.get(b.name) ?? 0 }));
  return <BrandsTable initialRows={rows} />;
}
