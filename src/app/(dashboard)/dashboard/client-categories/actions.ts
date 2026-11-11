'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveCategory(input: { id?: string; name: string }) {
  { const denied = await guard('/dashboard/client-categories', 'save', input); if (denied) return { error: denied }; }
  const name = input.name?.trim();
  if (!name) return { error: 'Kolom Category Name wajib diisi.' };

  const supabase = createClient();
  const query = input.id
    ? supabase.from('client_categories').update({ name }).eq('id', input.id)
    : supabase.from('client_categories').insert({ name });
  const { error } = await query;
  if (error) {
    return { error: error.code === '23505' ? 'Category tersebut sudah terdaftar.' : error.message };
  }

  revalidatePath('/dashboard/client-categories');
  revalidatePath('/dashboard/clients');
  return { success: true };
}

export async function deleteCategory(id: string) {
  { const denied = await guard('/dashboard/client-categories', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { error } = await supabase.from('client_categories').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/client-categories');
  revalidatePath('/dashboard/clients');
  return { success: true };
}
