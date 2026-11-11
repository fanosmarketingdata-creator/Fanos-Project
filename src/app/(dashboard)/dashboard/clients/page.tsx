import { createClient } from '@/lib/supabase/server';
import ClientsTable from './ClientsTable';

export default async function ClientsPage() {
  const supabase = createClient();
  const cols = 'id, client_no, company, contact_name, position, phone, email, address, credit_limit, status';
  // Kolom contacts (0035) & category (0041) mungkin belum ada: coba dari yang terlengkap.
  let clients: unknown[] | null = null;
  for (const extra of [', contacts, category', ', contacts', '']) {
    const r = await supabase.from('clients').select(cols + extra).order('created_at', { ascending: false });
    if (!r.error) { clients = r.data as unknown[] | null; break; }
  }

  const { data: catRows } = await supabase.from('client_categories').select('name').order('name');
  const categories = (catRows ?? []).map((c) => c.name as string);

  return (
    <div>
      <ClientsTable categories={categories} initialClients={(clients ?? []) as import('./ClientsTable').ClientRow[]} />
    </div>
  );
}
