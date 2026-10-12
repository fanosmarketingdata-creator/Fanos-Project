import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardShell from '@/components/DashboardShell';
import InactiveNotice from '@/components/InactiveNotice';

// Server Component: profil (termasuk role) diambil di server SEBELUM
// halaman dikirim ke browser. Jadi menu Superuser tidak akan pernah
// "kelihatan sekilas" untuk user biasa seperti yang dulu terjadi di
// versi Apps Script (karena dulu filtering menu baru terjadi setelah
// JS selesai load & sempat render HTML mentah dulu).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, status, photo_url')
    .eq('id', user.id)
    .single();

  // Akun yang dinonaktifkan Superuser langsung terkunci, tanpa menunggu
  // token login-nya kedaluwarsa.
  if (profile?.status === 'Inactive') return <InactiveNotice />;

  return (
    <DashboardShell profile={profile ?? { id: user.id, full_name: user.email ?? '-', role: 'Staff', photo_url: null }}>
      {children}
    </DashboardShell>
  );
}
