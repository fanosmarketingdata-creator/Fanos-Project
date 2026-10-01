'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type VendorInput = {
  id?: string;
  company: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export async function saveVendor(input: VendorInput) {
  if (!input.company?.trim()) {
    return { error: 'Nama perusahaan wajib diisi' };
  }

  const supabase = createClient();
  const payload = {
    company: input.company.trim(),
    contact_name: input.contact_name || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
  };

  const query = input.id
    ? supabase.from('vendors').update(payload).eq('id', input.id)
    : supabase.from('vendors').insert(payload);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath('/dashboard/vendors');
  return { success: true };
}

export async function deleteVendor(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/vendors');
  return { success: true };
}
