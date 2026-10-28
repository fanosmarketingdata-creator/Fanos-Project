import type { SupabaseClient } from '@supabase/supabase-js';

// Cari Project di Master Project berdasarkan nama (tanpa beda huruf besar/kecil);
// bila belum ada, buat otomatis (Project No terisi oleh trigger). Mengembalikan id-nya.
export async function ensureProject(supabase: SupabaseClient, name: string, clientId?: string | null): Promise<string | null> {
  const n = name?.trim();
  if (!n) return null;
  const { data: found } = await supabase.from('projects').select('id').ilike('name', n.replace(/[\\%_]/g, (m) => '\\' + m)).limit(1);
  if (found && found.length > 0) return found[0].id as string;

  let client_company: string | null = null;
  let client_name: string | null = null;
  if (clientId) {
    const { data: c } = await supabase.from('clients').select('company, contact_name').eq('id', clientId).single();
    client_company = c?.company ?? null;
    client_name = c?.contact_name ?? null;
  }
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: n, client_id: clientId || null, client_company, client_name })
    .select('id')
    .single();
  if (error) return null;
  return data.id as string;
}
