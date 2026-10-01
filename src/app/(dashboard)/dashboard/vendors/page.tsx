import { createClient } from '@/lib/supabase/server';
import VendorsTable from './VendorsTable';

export default async function VendorsPage() {
  const supabase = createClient();
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, company, contact_name, phone, email, address')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Vendors</h1>
      <p className="mb-6 text-sm text-slate-500">Daftar pemasok/vendor.</p>
      <VendorsTable initialVendors={vendors ?? []} />
    </div>
  );
}
