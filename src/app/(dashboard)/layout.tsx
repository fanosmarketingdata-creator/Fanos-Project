import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import '@/styles/registry.css';
import '@/styles/theme.css';
import { createClient } from '@/lib/supabase/server';
import DashboardShell from '@/components/DashboardShell';
import InactiveNotice from '@/components/InactiveNotice';
import NoAccess from '@/components/NoAccess';
import { canAccessPath } from '@/lib/menu';

// Server Component: profil (termasuk role) diambil di server SEBELUM
// halaman dikirim ke browser. Jadi menu Superuser tidak akan pernah
// "kelihatan sekilas" untuk user biasa seperti yang dulu terjadi di
// versi Apps Script (karena dulu filtering menu baru terjadi setelah
// JS selesai load & sempat render HTML mentah dulu).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  // Middleware sudah memvalidasi token lewat getUser() pada request ini,
  // jadi di sini cukup baca session dari cookie (tanpa round-trip ke
  // Supabase Auth lagi) — menghemat ratusan ms di setiap navigasi.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, status, photo_url, cursor_color')
    .eq('id', user.id)
    .single();

  // Akun yang dinonaktifkan Superuser langsung terkunci, tanpa menunggu
  // token login-nya kedaluwarsa.
  if (profile?.status === 'Inactive') return <InactiveNotice />;

  // Hak akses menu: Superuser selalu penuh. Role lain mengikuti daftar yang diatur Superuser
  // di Role Group; role tanpa data (mis. akun lama) tetap berakses penuh agar tidak terkunci.
  let allowed: string[] | null = null;
  if (profile && profile.role !== 'Superuser') {
    const { data: roleRow } = await supabase.from('roles').select('permissions').eq('name', profile.role).maybeSingle();
    if (roleRow) allowed = (roleRow.permissions as string[] | null) ?? [];
  }
  const pathname = headers().get('x-pathname') ?? '';
  const denied = !canAccessPath(allowed, pathname);

  return (
    <DashboardShell allowedMenus={allowed} profile={profile ?? { id: user.id, full_name: user.email ?? '-', role: 'Staff', photo_url: null, cursor_color: '#5B9BF6' }}>
      {denied ? <NoAccess /> : children}
    </DashboardShell>
  );
}
