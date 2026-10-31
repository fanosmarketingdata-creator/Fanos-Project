import { createClient } from '@/lib/supabase/server';
import ClientsTable from './ClientsTable';

export default async function ClientsPage() {
  const supabase = createClient();
  const cols = 'id, client_no, company, contact_name, position, phone, email, address, credit_limit, status';
  let clients: unknown[] | null = null;
  const r1 = await supabase.from('clients').select(cols + ', contacts').order('created_at', { ascending: false });
  clients = r1.data as unknown[] | null;
  // Kolom contacts belum ada (migrasi 0035 belum dijalankan): pakai kolom lama.
  if (r1.error) {
    const r2 = await supabase.from('clients').select(cols).order('created_at', { ascending: false });
    clients = r2.data as unknown[] | null;
  }

  return (
    <div>
      <ClientsTable initialClients={(clients ?? []) as import('./ClientsTable').ClientRow[]} />
    </div>
  );
}
