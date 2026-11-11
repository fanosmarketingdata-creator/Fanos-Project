'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, pickOption, checkSize, pruneAbsent, inChunks } from '@/lib/bulk-server';
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
    supabase.from('projects').select('id, project_no, name, client_id'),
  ]);
  const clientBy = new Map((clients ?? []).map((c) => [String(c.company).trim().toLowerCase(), c]));
  const classList = (classes ?? []).map((c) => c.name as string);
  const termList = (fin ?? []).filter((f) => f.kind === 'payment_term').map((f) => f.name as string);
  const cashList = (fin ?? []).filter((f) => f.kind === 'cashback').map((f) => f.name as string);
  const byNo = new Map((existing ?? []).filter((p) => p.project_no).map((p) => [String(p.project_no).trim().toLowerCase(), p]));
  const keyOf = (name: string, clientId: string) => `${name.trim().toLowerCase()}|${clientId}`;
  const owner = new Map<string, string>((existing ?? []).map((p) => [keyOf(String(p.name), String(p.client_id ?? '')), String(p.id)]));
  const nameOf = new Map<string, string>((existing ?? []).map((p) => [String(p.id), keyOf(String(p.name), String(p.client_id ?? ''))]));
  const seenIds = new Set<string>();

  const errors: ImportResult['errors'] = [];
  const adds: Record<string, unknown>[] = [];
  const upds: { id: string; data: Record<string, unknown> }[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const no = s(r.project_no);
    if (no && seenIds.has(no.toLowerCase())) { err(`Project ID "${no}" muncul lebih dari sekali di file.`); continue; }
    const match = no ? byNo.get(no.toLowerCase()) : undefined;
    const selfId = match ? String(match.id) : '';
    const name = s(r.name);
    if (!name) { err('Project Name wajib diisi.'); continue; }

    const client = s(r.client_company) ? clientBy.get(s(r.client_company).toLowerCase()) : undefined;
    if (s(r.client_company) && !client) { err(`Client "${s(r.client_company)}" belum ada di Master Client. Impor/buat client terlebih dahulu.`); continue; }
    const dupKey = keyOf(name, client ? (client.id as string) : '');
    const owned = owner.get(dupKey);
    if (owned && owned !== selfId) { err(`Project "${name}" untuk client ini sudah ada atau duplikat di file.`); continue; }

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

    const payload = {
      name, location: s(r.location) || null,
      classification: (cl as { v: string | null }).v, project_type: (ty as { v: string | null }).v,
      client_id: client ? (client.id as string) : null, client_company: client ? (client.company as string) : null, client_name: client ? (client.contact_name as string | null) : null,
      trigger_source: (tr as { v: string | null }).v, triggered_by: s(r.triggered_by) || null,
      top: (tp as { v: string | null }).v, cashback: (cb as { v: string | null }).v,
      updated_at: new Date().toISOString(),
    };
    if (no) seenIds.add(no.toLowerCase());
    if (match) {
      const old = nameOf.get(selfId);
      if (old) owner.delete(old);
      owner.set(dupKey, selfId); nameOf.set(selfId, dupKey);
      upds.push({ id: selfId, data: pruneAbsent(payload, r, {
        location: ['location'], classification: ['classification'], project_type: ['project_type'],
        client_id: ['client_company'], client_company: ['client_company'], client_name: ['client_company'],
        trigger_source: ['trigger_source'], triggered_by: ['triggered_by'], top: ['top'], cashback: ['cashback'],
      }) });
    } else {
      owner.set(dupKey, `new:${r._row}`);
      adds.push({ ...(no ? { project_no: no } : {}), ...payload });
    }
  }

  const result: ImportResult = { total: rows.length, valid: adds.length + upds.length, errors, added: adds.length, updated: upds.length };
  if (!commit || result.valid === 0) return result;
  if (adds.length) { const denied = await guard('/dashboard/projects', 'create'); if (denied) return { ...result, error: denied }; }
  if (upds.length) { const denied = await guard('/dashboard/projects', 'edit'); if (denied) return { ...result, error: denied }; }
  if (adds.length) {
    const { error } = await supabase.from('projects').insert(adds);
    if (error) return { ...result, error: error.message };
  }
  const updErr = await inChunks(upds, 20, async (u) => {
    const { error } = await supabase.from('projects').update(u.data).eq('id', u.id);
    return error ? error.message : null;
  });
  if (updErr) return { ...result, error: 'Sebagian data gagal diperbarui: ' + updErr };
  revalidatePath('/dashboard/projects');
  return { ...result, inserted: adds.length + upds.length };
}
