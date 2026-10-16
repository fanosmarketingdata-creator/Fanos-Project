import { createClient } from '@/lib/supabase/server';
import POForm from '../POForm';

export default async function NewPOPage() {
  const supabase = createClient();
  const [{ data: vendors }, { data: products }] = await Promise.all([
    supabase.from('vendors').select('id, company').order('company'),
    supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
  ]);

  return (
    <div>
      <h1 className="page-title"><i className="fa-solid fa-truck-loading" />Buat Purchase Order</h1>
      <p className="mb-6 text-sm text-slate-500">Pesanan pembelian ke vendor.</p>
      <POForm vendors={vendors ?? []} products={products ?? []} />
    </div>
  );
}
