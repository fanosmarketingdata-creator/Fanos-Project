import { createClient } from '@/lib/supabase/server';
import { requireSuperuser } from '@/lib/auth';
import AccountsTable from './AccountsTable';

export default async function AccountsPage() {
  const me = await requireSuperuser();

  const supabase = createClient();
  const [{ data: profiles }, { data: roles }, { data: members }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, role, status, phone, photo_url, cursor_color, team_member_id, team_members(name)')
      .order('full_name'),
    supabase.from('roles').select('name').order('name'),
    supabase.from('team_members').select('id, name').order('name'),
  ]);

  const rows = (profiles ?? []).map((p) => {
    const tm = p.team_members as unknown as { name: string } | { name: string }[] | null;
    const memberName = Array.isArray(tm) ? tm[0]?.name : tm?.name;
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email ?? '',
      role: p.role,
      status: p.status as 'Active' | 'Inactive',
      phone: p.phone,
      photo_url: p.photo_url,
      cursor_color: p.cursor_color ?? '#5B9BF6',
      team_member_id: p.team_member_id,
      team_member_name: memberName ?? null,
    };
  });

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-user-lock" />Master Akun</h1>
      <p className="mb-6 text-sm text-slate-500">
        Akun login pengguna. Setiap team member hanya dapat memiliki satu akun, dan akun berstatus Inactive tidak dapat masuk ke sistem.
      </p>
      <AccountsTable
        currentUserId={me.id}
        initialRows={rows}
        roles={(roles ?? []).map((r) => r.name)}
        teamMembers={members ?? []}
      />
    </div>
  );
}
