import { createClient } from '@/lib/supabase/server';
import ClientsTable from './ClientsTable';

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, project_name, company, contact_name, phone, email, address, city')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Clients</h1>
      <p className="mb-6 text-sm text-slate-500">Daftar klien/proyek.</p>
      <ClientsTable initialClients={clients ?? []} />
    </div>
  );
}
