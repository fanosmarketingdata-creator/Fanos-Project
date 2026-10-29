import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { canDo, type CrudAction, type RoleActions } from '@/lib/menu';

type Ctx = { allowed: string[] | null; actions: RoleActions | null };

// Hak akses role pengguna saat ini (sekali per request).
export const loadPermissions = cache(async (): Promise<Ctx> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: [], actions: null };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role === 'Superuser') return { allowed: null, actions: null };
  type RowT = { permissions?: string[] | null; role_actions?: RoleActions | null };
  let row = null as RowT | null;
  const withActions = await supabase.from('roles').select('permissions, role_actions').eq('name', profile.role).maybeSingle();
  if (withActions.error) {
    // kolom role_actions belum ada (migrasi belum dijalankan): pakai akses menu saja.
    const plain = await supabase.from('roles').select('permissions').eq('name', profile.role).maybeSingle();
    row = plain.data as RowT | null;
  } else {
    row = withActions.data as unknown as RowT | null;
  }
  if (!row) return { allowed: null, actions: null };
  return { allowed: row.permissions ?? [], actions: row.role_actions ?? null };
});

const LABEL: Record<CrudAction, string> = { create: 'menambah', edit: 'mengubah', delete: 'menghapus' };

// Penjaga aksi server: kembalikan pesan error bila role tidak berhak, null bila boleh.
// kind 'save' = create bila data belum punya id, edit bila sudah punya id.
export async function guard(href: string, kind: CrudAction | 'save', arg?: unknown): Promise<string | null> {
  const action: CrudAction = kind === 'save' ? ((arg as { id?: unknown } | null | undefined)?.id ? 'edit' : 'create') : kind;
  const { allowed, actions } = await loadPermissions();
  if (canDo(allowed, actions, href, action)) return null;
  return `Role Anda tidak memiliki izin untuk ${LABEL[action]} data pada menu ini.`;
}
