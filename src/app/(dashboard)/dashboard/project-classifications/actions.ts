'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveClassification(input: { id?: string; name: string }) {
  const name = input.name?.trim();
  if (!name) return { error: 'Kolom Classification Name wajib diisi.' };

  const supabase = createClient();
  const query = input.id
    ? supabase.from('project_classifications').update({ name }).eq('id', input.id)
    : supabase.from('project_classifications').insert({ name });
  const { error } = await query;
  if (error) {
    return { error: error.code === '23505' ? 'Classification tersebut sudah terdaftar.' : error.message };
  }

  revalidatePath('/dashboard/project-classifications');
  revalidatePath('/dashboard/projects');
  return { success: true };
}

export async function deleteClassification(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('project_classifications').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/project-classifications');
  revalidatePath('/dashboard/projects');
  return { success: true };
}
