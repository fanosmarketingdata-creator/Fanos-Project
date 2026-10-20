import { createClient } from '@/lib/supabase/server';
import POForm from '../POForm';

export default async function NewPOPage() {
  const supabase = createClient();
  const [{ data: vendors }, { data: products }] = await Promise.all([
    supabase.from('vendors').select('id, company').order('company'),
    supabase.from('products').select('id, sku, name, uom, image_url, brand, category').eq('is_active', true).order('sku'),
  ]);

  return (
    <POForm vendors={vendors ?? []} products={products ?? []} />
  );
}
