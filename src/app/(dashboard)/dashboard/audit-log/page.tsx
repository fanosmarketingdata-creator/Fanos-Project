import { createClient } from '@/lib/supabase/server';
import { orThrowAll } from '@/lib/query';
import { AUDIT_COLUMNS, type AuditLog } from '@/lib/audit';
import AuditLogTable from './AuditLogTable';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createClient();
  // 1000 aktivitas terbaru (RLS: hanya Superuser yang dapat membaca).
  const [{ data }] = orThrowAll(await Promise.all([
    supabase.from('audit_logs').select(AUDIT_COLUMNS).order('created_at', { ascending: false }).limit(1000),
  ]));
  return <AuditLogTable initialRows={(data ?? []) as AuditLog[]} />;
}
