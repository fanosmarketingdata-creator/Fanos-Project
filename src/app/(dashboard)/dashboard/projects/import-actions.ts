'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, pickOption, checkSize } from '@/lib/bulk-server';
import { PROJECT_TRIGGER_OPTIONS, PROJECT_TYPE_OPTIONS } from '@/lib/master-options';

export async function importProjects(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/projects', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const [{ data: clients }, { data: classes }, { data: fin }, { data: existing }] = await Promise.all([
    supabase.from('clients').select('id, company, contact_name'),
    supabase.from('project_classifications').select('name'),
    supabase.from('finance_options').select('kind, name').in('kind', ['payment_term', 'cashback']),
    supabase.from('projects').select('name, client_id'),
  ]);
  const clientBy = new Map((clients ?? []).map((c) => [String(c.company).trim().toLowerCase(), c]));
  const classList = (classes ?? []).map((c) => c.name as string);
  const termList = (fin ?? []).filter((f) => f.kind === 'payment_term').map((f) => f.name as string);
  const cashList = (fin ?? []).filter((f) => f.kind === 'cashback').map((f) => f.name as string);
  const seen = new Set((existing ?? []).map((p) => `${String(p.name).trim().toLowerCase()}|${p.client_id ?? ''}`));

  const errors: ImportResult['errors'] = [];
  const good: Record<string, unknown>[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const name = s(r.name);
    if (!name) { err('Project Name wajib diisi.'); continue; }

    const client = s(r.client_company) ? clientBy.get(s(r.client_company).toLowerCase()) : undefined;
    if (s(r.client_company) && !client) { err(`Client "${s(r.client_company)}" belum ada di Master Client. Impor/buat client terlebih dahulu.`); continue; }
    const dupKey = `${name.toLowerCase()}|${client ? (client.id as string) : ''}`;
    if (seen.has(dupKey)) { err(`Project "${name}" untuk client ini sudah ada atau duplikat di file.`); continue; }

    const pick = (val: string, list: string[], label: string) => {
      if (!s(val)) return { ok: true as const, v: null as string | null };
      const m = pickOption(val, list);
      return m ? { ok: true as const, v: m } : { ok: false as const, msg: `${label} tidak dikenal: "${s(val)}". Pilihan: ${list.join(', ') || '(belum ada data master)'}.` };
    };
    const cl = pick(r.classification, classList, 'Classification');
    const ty = pick(r.project_type, PROJECT_TYPE_OPTIONS, 'Project Type');
    const tr = pick(r.trigger_source, PROJECT_TRIGGER_OPTIONS, 'Trigger');
    const tp = pick(r.top, termList, 'TOP');
    const cb = pick(r.cashback, cashList, 'Cashback');
    const fail = [cl, ty, tr, tp, cb].find((x) => !x.ok);
    if (fail && !fail.ok) { err(fail.msg); continue; }

    seen.add(dupKey);
    good.push({
      name, location: s(r.location) || null,
      classification: (cl as { v: string | null }).v, project_type: (ty as { v: string | null }).v,
      client_id: client ? (client.id as string) : null, client_company: client ? (client.company as string) : null, client_name: client ? (client.contact_name as string | null) : null,
      trigger_source: (tr as { v: string | null }).v, triggered_by: s(r.triggered_by) || null,
      top: (tp as { v: string | null }).v, cashback: (cb as { v: string | null }).v,
      updated_at: new Date().toISOString(),
    });
  }

  const result: ImportResult = { total: rows.length, valid: good.length, errors };
  if (!commit || good.length === 0) return result;
  const { error } = await supabase.from('projects').insert(good);
  if (error) return { ...result, error: error.message };
  revalidatePath('/dashboard/projects');
  return { ...result, inserted: good.length };
}
