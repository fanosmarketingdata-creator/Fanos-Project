import { createClient } from '@/lib/supabase/server';
import { requireSuperuser } from '@/lib/auth';
import TeamMembersTable from './TeamMembersTable';

type LinkedProfile = { photo_url: string | null; email: string | null };

export default async function TeamMembersPage() {
  await requireSuperuser();

  const supabase = createClient();
  const { data: members } = await supabase
    .from('team_members')
    .select('id, name, role_title, email, phone, profiles(photo_url, email)')
    .order('name');

  const rows = (members ?? []).map((m) => {
    // profiles.team_member_id bersifat unik, jadi hasilnya objek tunggal
    // (atau null); jaga-jaga kalau terbaca sebagai array.
    const raw = m.profiles as unknown as LinkedProfile | LinkedProfile[] | null;
    const linked = Array.isArray(raw) ? raw[0] ?? null : raw;
    return {
      id: m.id,
      name: m.name,
      role_title: m.role_title,
      email: m.email,
      phone: m.phone,
      has_account: !!linked,
      photo_url: linked?.photo_url ?? null,
    };
  });

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-users-alt" />Master Team Member</h1>
      <p className="mb-6 text-sm text-slate-500">
        Data anggota tim. Satu anggota bisa dihubungkan ke satu akun login lewat menu Master Akun.
      </p>
      <TeamMembersTable initialRows={rows} />
    </div>
  );
}
