'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSuperuserOrNull, NOT_SUPERUSER_ERROR } from '@/lib/auth';

export type RoleInput = { id?: string; name: string; description?: string };

const PROTECTED_ROLE = 'Superuser';

export async function saveRole(input: RoleInput) {
  if (!(await getSuperuserOrNull())) return { error: NOT_SUPERUSER_ERROR };

  const name = input.name?.trim();
  if (!name) return { error: 'Kolom Nama role wajib diisi.' };

  const supabase = createClient();

  if (input.id) {
    const { data: existing } = await supabase.from('roles').select('name').eq('id', input.id).single();
    if (!existing) return { error: 'Role tidak ditemukan' };
    if (existing.name === PROTECTED_ROLE && name !== PROTECTED_ROLE) {
      return { error: 'Role Superuser tidak boleh diganti namanya' };
    }

    const { error } = await supabase
      .from('roles')
      .update({ name, description: input.description || null })
      .eq('id', input.id);
    if (error) {
      if (error.code === '23505') return { error: 'Nama role telah digunakan.' };
      return { error: error.message };
    }

    // profiles.role menyimpan NAMA role, jadi kalau role di-rename akun yang
    // memakainya ikut diperbarui.
    if (existing.name !== name) {
      const { error: cascadeErr } = await supabase.from('profiles').update({ role: name }).eq('role', existing.name);
      if (cascadeErr) return { error: cascadeErr.message };
    }
  } else {
    const { error } = await supabase.from('roles').insert({ name, description: input.description || null });
    if (error) {
      if (error.code === '23505') return { error: 'Nama role telah digunakan.' };
      return { error: error.message };
    }
  }

  revalidatePath('/dashboard/roles');
  revalidatePath('/dashboard/accounts');
  return { success: true };
}

export async function deleteRole(id: string) {
  if (!(await getSuperuserOrNull())) return { error: NOT_SUPERUSER_ERROR };

  const supabase = createClient();
  const { data: role } = await supabase.from('roles').select('name').eq('id', id).single();
  if (!role) return { error: 'Role tidak ditemukan' };
  if (role.name === PROTECTED_ROLE) return { error: 'Role Superuser tidak boleh dihapus' };

  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', role.name);
  if ((count ?? 0) > 0) return { error: 'Role ini masih digunakan oleh akun sehingga tidak dapat dihapus.' };

  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/roles');
  return { success: true };
}
