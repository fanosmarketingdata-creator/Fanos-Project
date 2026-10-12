import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type CurrentProfile = {
  id: string;
  full_name: string;
  role: string;
  status: string;
  photo_url: string | null;
};

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, role, status, photo_url')
    .eq('id', user.id)
    .single();

  return data;
}

// Dipakai di Server Component (halaman): redirect kalau bukan Superuser.
export async function requireSuperuser() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'Superuser' || profile.status !== 'Active') redirect('/dashboard');
  return profile;
}

// Dipakai di Server Action: kembalikan profil kalau Superuser, null kalau bukan.
// (Server Action bisa dipanggil langsung dari luar UI, jadi pengecekan di
// halaman saja TIDAK cukup — setiap action harus cek sendiri.)
export async function getSuperuserOrNull() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'Superuser' || profile.status !== 'Active') return null;
  return profile;
}

export const NOT_SUPERUSER_ERROR = 'Hanya Superuser yang boleh melakukan aksi ini';
