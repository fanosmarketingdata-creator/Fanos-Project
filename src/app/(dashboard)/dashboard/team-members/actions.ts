'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSuperuserOrNull, NOT_SUPERUSER_ERROR } from '@/lib/auth';

export type TeamMemberInput = {
  id?: string;
  name: string;
  role_title?: string;
  email?: string;
  phone?: string;
};

export async function saveTeamMember(input: TeamMemberInput) {
  if (!(await getSuperuserOrNull())) return { error: NOT_SUPERUSER_ERROR };
  if (!input.name?.trim()) return { error: 'Kolom Nama wajib diisi.' };

  const supabase = createClient();
  const payload = {
    name: input.name.trim(),
    role_title: input.role_title || null,
    email: input.email || null,
    phone: input.phone || null,
  };

  const query = input.id
    ? supabase.from('team_members').update(payload).eq('id', input.id)
    : supabase.from('team_members').insert(payload);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath('/dashboard/team-members');
  revalidatePath('/dashboard/accounts');
  return { success: true };
}

export async function deleteTeamMember(id: string) {
  if (!(await getSuperuserOrNull())) return { error: NOT_SUPERUSER_ERROR };

  const supabase = createClient();
  // Akun yang tertaut tidak ikut terhapus: kolom profiles.team_member_id
  // otomatis jadi kosong (on delete set null).
  const { error } = await supabase.from('team_members').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/team-members');
  revalidatePath('/dashboard/accounts');
  return { success: true };
}
