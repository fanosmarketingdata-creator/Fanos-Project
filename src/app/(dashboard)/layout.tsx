import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import '@/styles/registry.css';
import '@/styles/theme.css';
import { createClient } from '@/lib/supabase/server';
import DashboardShell from '@/components/DashboardShell';
import InactiveNotice from '@/components/InactiveNotice';
import NoAccess from '@/components/NoAccess';
import { PermProvider } from '@/components/PermProvider';
import { canAccessPath, canDo, menuKeyForPath, type RoleActions } from '@/lib/menu';

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
    .select('id, full_name, role, status, photo_url, cursor_color, phone, email')
    .eq('id', user.id)
    .single();

  // Akun yang dinonaktifkan Superuser langsung terkunci, tanpa menunggu
  // token login-nya kedaluwarsa.
  if (profile?.status === 'Inactive') return <InactiveNotice />;

  // Hak akses menu: Superuser selalu penuh. Role lain mengikuti daftar yang diatur Superuser
  // di Role Group; role tanpa data (mis. akun lama) tetap berakses penuh agar tidak terkunci.
  let allowed: string[] | null = null;
  let roleActions: RoleActions | null = null;
  if (profile && profile.role !== 'Superuser') {
    type RoleRowT = { permissions?: string[] | null; role_actions?: RoleActions | null };
    let roleRow = null as RoleRowT | null;
    const r1 = await supabase.from('roles').select('permissions, role_actions').eq('name', profile.role).maybeSingle();
    if (r1.error) {
      // kolom role_actions belum ada (migrasi 0034 belum dijalankan)
      const r2 = await supabase.from('roles').select('permissions').eq('name', profile.role).maybeSingle();
      roleRow = r2.data as RoleRowT | null;
    } else {
      roleRow = r1.data as unknown as RoleRowT | null;
    }
    if (roleRow) {
      allowed = roleRow.permissions ?? [];
      roleActions = roleRow.role_actions ?? null;
    }
  }
  const pathname = headers().get('x-pathname') ?? '';
  const menuKey = menuKeyForPath(pathname);
  const can = (a: 'create' | 'edit' | 'delete') => (menuKey ? canDo(allowed, roleActions, menuKey, a) : true);
  // Halaman form "baru" / "edit" mengikuti izin Create / Edit menu terkait.
  const rest = menuKey ? pathname.slice(menuKey.length) : '';
  const needsCreate = /\/new(\/|$)/.test(rest);
  const needsEdit = /\/edit(\/|$)/.test(rest);
  const denied = !canAccessPath(allowed, pathname) || (needsCreate && !can('create')) || (needsEdit && !can('edit'));

  return (
    <DashboardShell allowedMenus={allowed} profile={profile ?? { id: user.id, full_name: user.email ?? '-', role: 'Staff', photo_url: null, cursor_color: '#5B9BF6' }}>
      {denied ? (
        <NoAccess />
      ) : (
        <div
          className="perm-scope"
          data-no-create={can('create') ? undefined : '1'}
          data-no-edit={can('edit') ? undefined : '1'}
          data-no-delete={can('delete') ? undefined : '1'}
        >
          <PermProvider value={{ create: can('create'), edit: can('edit'), delete: can('delete') }}>{children}</PermProvider>
        </div>
      )}
    </DashboardShell>
  );
}
