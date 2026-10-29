'use server';

import { createClient } from '@/lib/supabase/server';

// Data untuk dropdown Project/Client di form BOQ & Quotation serta pop up tambah baru.
export async function getProjectClientLookups() {
  const supabase = createClient();
  const [{ data: projects }, { data: clients }, { data: classes }] = await Promise.all([
    supabase.from('projects').select('id, name, client_id, project_no').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company, contact_name').order('company'),
    supabase.from('project_classifications').select('name').order('created_at'),
  ]);
  return {
    projects: (projects ?? []) as { id: string; name: string; client_id: string | null; project_no: string | null }[],
    clients: (clients ?? []) as { id: string; company: string; contact_name: string | null }[],
    classifications: (classes ?? []).map((c) => c.name as string),
  };
}

export async function getBrandNames() {
  const supabase = createClient();
  const { data } = await supabase.from('brands').select('name').order('name');
  return (data ?? []).map((b) => b.name as string);
}
