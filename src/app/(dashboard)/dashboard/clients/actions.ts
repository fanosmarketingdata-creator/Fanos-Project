'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ClientInput = {
  id?: string;
  company: string;
  contact_name?: string;
  position?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit?: number | null;
  status?: string;
};

export async function saveClient(input: ClientInput) {
  if (!input.company?.trim()) {
    return { error: 'Kolom Company Name wajib diisi.' };
  }

  const supabase = createClient();
  // Client No (AUTOGENERATE) dibuat oleh database; project_name disinkronkan dari company oleh trigger.
  const payload = {
    company: input.company.trim(),
    contact_name: input.contact_name || null,
    position: input.position || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    credit_limit: input.credit_limit ?? null,
    status: ['Active', 'Inactive', 'Blacklist', 'Unverified'].includes(input.status || '') ? input.status : 'Unverified',
  };

  let id = input.id;
  if (id) {
    const { error } = await supabase.from('clients').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from('clients').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data.id as string;
  }

  revalidatePath('/dashboard/clients');
  return { success: true, id, company: payload.company };
}

export async function deleteClient(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/clients');
  return { success: true };
}
