'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Pengguna mengubah profilnya sendiri. Role, status, team member, dan warna kursor tetap hanya bisa diubah Superuser (dijaga trigger database).
export async function updateMyProfile(input: { full_name: string; phone?: string; photo_url?: string | null }) {
  const name = input.full_name?.trim();
  if (!name) return { error: 'Kolom Nama lengkap wajib diisi.' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesi login berakhir. Silakan login kembali.' };
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: name, phone: input.phone?.trim() || null, photo_url: input.photo_url || null })
    .eq('id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}
