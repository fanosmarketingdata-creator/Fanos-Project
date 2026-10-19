'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSuperuserOrNull, NOT_SUPERUSER_ERROR } from '@/lib/auth';

export type AccountInput = {
  id?: string;
  email: string;
  password?: string; // wajib untuk akun baru; di edit = reset password (opsional)
  full_name: string;
  role: string;
  status: 'Active' | 'Inactive';
  team_member_id?: string;
  phone?: string;
  photo_url?: string;
  cursor_color?: string; // warna Figma Cursor akun ini, hex #RRGGBB
};

const MIN_PASSWORD = 8;

export async function saveAccount(input: AccountInput): Promise<{ error?: string; success?: boolean }> {
  try {
    return await saveAccountInner(input);
  } catch (e) {
    // Next.js menyembunyikan pesan exception di production, jadi kita
    // tangkap sendiri dan kembalikan pesan yang bisa dibaca di UI.
    console.error('saveAccount failed', e);
    return { error: e instanceof Error ? e.message : 'Terjadi kesalahan di server' };
  }
}

async function saveAccountInner(input: AccountInput): Promise<{ error?: string; success?: boolean }> {
  // 1) Pemanggil HARUS Superuser — dicek di server karena Server Action
  //    bisa dipanggil langsung tanpa lewat UI.
  const me = await getSuperuserOrNull();
  if (!me) return { error: NOT_SUPERUSER_ERROR };

  // 2) Validasi input
  if (!input.full_name?.trim()) return { error: 'Kolom Nama lengkap wajib diisi.' };
  if (!input.role) return { error: 'Mohon pilih Role terlebih dahulu.' };
  if (!input.id) {
    if (!input.email?.trim()) return { error: 'Kolom Email wajib diisi.' };
    if (!input.password || input.password.length < MIN_PASSWORD) {
      return { error: `Kata sandi minimal ${MIN_PASSWORD} karakter` };
    }
  } else if (input.password && input.password.length < MIN_PASSWORD) {
    return { error: `Kata sandi baru minimal ${MIN_PASSWORD} karakter` };
  }

  if (input.cursor_color && !/^#[0-9a-fA-F]{6}$/.test(input.cursor_color)) {
    return { error: 'Warna kursor harus berformat hex, contoh #5B9BF6.' };
  }

  // 3) Jangan sampai Superuser mengunci dirinya sendiri
  if (input.id && input.id === me.id) {
    if (input.role !== 'Superuser') return { error: 'Anda tidak dapat mengubah role akun Anda sendiri.' };
    if (input.status !== 'Active') return { error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' };
  }

  // 4) Role harus ada di daftar Role Group
  const supabase = createClient();
  const { data: roleRow } = await supabase.from('roles').select('id').eq('name', input.role).maybeSingle();
  if (!roleRow) return { error: 'Role tidak ditemukan di Role Group' };

  const admin = createAdminClient();
  let userId = input.id;
  const isNew = !userId;

  if (isNew) {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email.trim(),
      password: input.password!,
      email_confirm: true,
      user_metadata: { full_name: input.full_name.trim() },
    });
    if (error) return { error: error.message };
    userId = data.user.id;
  } else if (input.password) {
    const { error } = await admin.auth.admin.updateUserById(userId!, { password: input.password });
    if (error) return { error: error.message };
  }

  // Akun Inactive diblokir di level Supabase Auth (tidak bisa login lagi).
  const { error: banError } = await admin.auth.admin.updateUserById(userId!, {
    ban_duration: input.status === 'Inactive' ? '876000h' : 'none',
  });
  if (banError) {
    if (isNew) await admin.auth.admin.deleteUser(userId!);
    return { error: banError.message };
  }

  // Trigger handle_new_user sudah membuat baris profiles; lengkapi di sini.
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: input.full_name.trim(),
      role: input.role,
      status: input.status,
      team_member_id: input.team_member_id || null,
      phone: input.phone || null,
      photo_url: input.photo_url || null,
      cursor_color: input.cursor_color || '#5B9BF6',
    })
    .eq('id', userId!);

  if (profileError) {
    // Akun baru yang gagal dilengkapi dibatalkan supaya tidak ada akun "setengah jadi".
    if (isNew) await admin.auth.admin.deleteUser(userId!);
    if (profileError.code === '23505') return { error: 'Team member ini telah memiliki akun login lain.' };
    return { error: profileError.message };
  }

  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard/team-members');
  return { success: true };
}

export async function deleteAccount(id: string): Promise<{ error?: string; success?: boolean }> {
  try {
    return await deleteAccountInner(id);
  } catch (e) {
    console.error('deleteAccount failed', e);
    return { error: e instanceof Error ? e.message : 'Terjadi kesalahan di server' };
  }
}

async function deleteAccountInner(id: string): Promise<{ error?: string; success?: boolean }> {
  const me = await getSuperuserOrNull();
  if (!me) return { error: NOT_SUPERUSER_ERROR };
  if (id === me.id) return { error: 'Anda tidak dapat menghapus akun Anda sendiri.' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id); // baris profiles ikut terhapus (cascade)
  if (error) return { error: error.message };

  revalidatePath('/dashboard/accounts');
  revalidatePath('/dashboard/team-members');
  return { success: true };
}
