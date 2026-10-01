'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ClientInput = {
  id?: string;
  project_name: string;
  company?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
};

export async function saveClient(input: ClientInput) {
  if (!input.project_name?.trim()) {
    return { error: 'Project Name wajib diisi' };
  }

  const supabase = createClient();
  const payload = {
    project_name: input.project_name.trim(),
    company: input.company || null,
    contact_name: input.contact_name || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    city: input.city || null,
  };

  const query = input.id
    ? supabase.from('clients').update(payload).eq('id', input.id)
    : supabase.from('clients').insert(payload);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath('/dashboard/clients');
  return { success: true };
}

export async function deleteClient(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/clients');
  return { success: true };
}
