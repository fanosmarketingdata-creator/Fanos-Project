import { createClient } from '@/lib/supabase/server';
import VendorsTable from './VendorsTable';
import { orThrow } from '@/lib/query';

export default async function VendorsPage() {
  const supabase = createClient();
  const { data: vendors } = orThrow(await supabase
    .from('vendors')
    .select('id, vendor_no, company, contact_name, position, phone, email, address, top')
    .order('created_at', { ascending: false }));

  return (
    <div>
      <VendorsTable initialVendors={vendors ?? []} />
    </div>
  );
}
