'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ProjectInput = {
  id?: string;
  name: string;
  location?: string;
  classification?: string;
  project_type?: string;
  client_id?: string; // LOOKUP -> Client Company; Client Name diambil dari Contact Person client
  trigger_source?: string;
  triggered_by?: string;
  top?: string;
  cashback?: string;
};

export async function saveProject(input: ProjectInput) {
  if (!input.name?.trim()) return { error: 'Kolom Project Name wajib diisi.' };

  const supabase = createClient();

  // LOOKUP: Client Company & Client Name diisi dari data Client yang dipilih.
  let client_company: string | null = null;
  let client_name: string | null = null;
  if (input.client_id) {
    const { data: c } = await supabase.from('clients').select('company, contact_name').eq('id', input.client_id).single();
    client_company = c?.company ?? null;
    client_name = c?.contact_name ?? null;
  }

  const payload = {
    name: input.name.trim(),
    location: input.location || null,
    classification: input.classification || null,
    project_type: input.project_type || null,
    client_id: input.client_id || null,
    client_company,
    client_name,
    trigger_source: input.trigger_source || null,
    triggered_by: input.triggered_by || null,
    top: input.top || null,
    cashback: input.cashback || null,
    updated_at: new Date().toISOString(),
  };

  let id = input.id;
  if (id) {
    const { error } = await supabase.from('projects').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data.id as string;
  }

  revalidatePath('/dashboard/projects');
  return { success: true, id, name: payload.name, client_id: payload.client_id };
}

export async function deleteProject(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/projects');
  return { success: true };
}
