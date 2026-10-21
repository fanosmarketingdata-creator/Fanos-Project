import { createClient } from '@/lib/supabase/server';
import { requireSuperuser } from '@/lib/auth';
import RolesTable from './RolesTable';

export default async function RolesPage() {
  await requireSuperuser();

  const supabase = createClient();
  const [{ data: roles }, { data: profiles }] = await Promise.all([
    supabase.from('roles').select('id, name, description, permissions').order('name'),
    supabase.from('profiles').select('role'),
  ]);

  const usage = new Map<string, number>();
  (profiles ?? []).forEach((p) => usage.set(p.role, (usage.get(p.role) ?? 0) + 1));

  const rows = (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: (r.permissions as string[] | null) ?? [],
    account_count: usage.get(r.name) ?? 0,
  }));

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-shield-check" />Role Group</h1>
      <p className="mb-6 text-sm text-slate-500">
        Kelompok peran untuk akun login beserta hak akses menunya. Hanya Superuser yang dapat mengubah hak akses.
      </p>
      <RolesTable initialRows={rows} />
    </div>
  );
}
