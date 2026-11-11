'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, pickOption, emailOk, checkSize, pruneAbsent, inChunks } from '@/lib/bulk-server';
import { TOP_OPTIONS } from '@/lib/master-options';

export async function importVendors(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/vendors', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const { data: existing } = await supabase.from('vendors').select('id, vendor_no, company');
  const byNo = new Map((existing ?? []).filter((v) => v.vendor_no).map((v) => [String(v.vendor_no).trim().toLowerCase(), v]));
  const owner = new Map<string, string>((existing ?? []).map((c) => [String(c.company).trim().toLowerCase(), String(c.id)]));
  const nameOf = new Map<string, string>((existing ?? []).map((c) => [String(c.id), String(c.company).trim().toLowerCase()]));
  const seenIds = new Set<string>();
  const tops = TOP_OPTIONS.map((t) => (typeof t === 'string' ? t : (t as { value: string }).value));

  const errors: ImportResult['errors'] = [];
  const adds: Record<string, unknown>[] = [];
  const upds: { id: string; data: Record<string, unknown> }[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const no = s(r.vendor_no);
    if (no && seenIds.has(no.toLowerCase())) { err(`Vendor ID "${no}" muncul lebih dari sekali di file.`); continue; }
    const match = no ? byNo.get(no.toLowerCase()) : undefined;
    const selfId = match ? String(match.id) : '';
    const company = s(r.company);
    if (!company) { err('Nama Perusahaan wajib diisi.'); continue; }
    const owned = owner.get(company.toLowerCase());
    if (owned && owned !== selfId) { err(`Vendor "${company}" sudah ada atau duplikat di file.`); continue; }
    let top: string | null = null;
    if (s(r.top)) {
      top = pickOption(r.top, tops);
      if (!top) { err(`TOP harus salah satu dari: ${tops.join(', ')}.`); continue; }
    }
    if (s(r.email) && !emailOk(s(r.email))) { err('Format email tidak valid.'); continue; }
    const payload = {
      company, contact_name: s(r.contact_name) || null, position: s(r.position) || null, top,
      phone: s(r.phone) || null, email: s(r.email) || null, address: s(r.address) || null,
    };
    if (no) seenIds.add(no.toLowerCase());
    if (match) {
      const oldKey = nameOf.get(selfId);
      if (oldKey) owner.delete(oldKey);
      owner.set(company.toLowerCase(), selfId); nameOf.set(selfId, company.toLowerCase());
      upds.push({ id: selfId, data: pruneAbsent(payload, r, {
        contact_name: ['contact_name'], position: ['position'], top: ['top'], phone: ['phone'], email: ['email'], address: ['address'],
      }) });
    } else {
      owner.set(company.toLowerCase(), `new:${r._row}`);
      adds.push({ ...(no ? { vendor_no: no } : {}), ...payload });
    }
  }

  const result: ImportResult = { total: rows.length, valid: adds.length + upds.length, errors, added: adds.length, updated: upds.length };
  if (!commit || result.valid === 0) return result;
  if (adds.length) { const denied = await guard('/dashboard/vendors', 'create'); if (denied) return { ...result, error: denied }; }
  if (upds.length) { const denied = await guard('/dashboard/vendors', 'edit'); if (denied) return { ...result, error: denied }; }
  if (adds.length) {
    const { error } = await supabase.from('vendors').insert(adds);
    if (error) return { ...result, error: error.message };
  }
  const updErr = await inChunks(upds, 20, async (u) => {
    const { error } = await supabase.from('vendors').update(u.data).eq('id', u.id);
    return error ? error.message : null;
  });
  if (updErr) return { ...result, error: 'Sebagian data gagal diperbarui: ' + updErr };
  revalidatePath('/dashboard/vendors');
  return { ...result, inserted: adds.length + upds.length };
}
