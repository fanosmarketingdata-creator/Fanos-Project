import { createClient } from '@/lib/supabase/server';
import ClientsTable from './ClientsTable';

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, client_no, company, contact_name, position, phone, email, address, credit_limit, status')
    .order('created_at', { ascending: false });

  return (
    <div>
      <ClientsTable initialClients={clients ?? []} />
    </div>
  );
}
