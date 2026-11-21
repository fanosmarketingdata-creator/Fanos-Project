'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// Dipakai halaman login untuk memberi tanda hijau/merah pada kolom email
// sebelum kata sandi diperiksa. Hanya mengembalikan true/false.
export async function emailRegistered(email: string): Promise<boolean> {
  const e = String(email || '').trim().toLowerCase();
  if (!e || e.length > 254) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('profiles').select('id').ilike('email', e.replace(/[%_\\]/g, '\\$&')).limit(1);
    return !!data && data.length > 0;
  } catch {
    // Jika pengecekan gagal (mis. server), jangan blokir login: biarkan Supabase Auth yang memutuskan.
    return true;
  }
}
