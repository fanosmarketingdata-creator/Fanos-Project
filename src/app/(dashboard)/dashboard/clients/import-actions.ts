'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, parseNum, pickOption, emailOk, checkSize, pruneAbsent, inChunks } from '@/lib/bulk-server';

const STATUSES = ['Active', 'Inactive', 'Blacklist', 'Unverified'];

export async function importClients(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/clients', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const { data: existing } = await supabase.from('clients').select('id, client_no, company, contacts');
  const { data: catRows } = await supabase.from('client_categories').select('name');
  const cats = (catRows ?? []).map((c) => c.name as string);
  const byNo = new Map((existing ?? []).filter((c) => c.client_no).map((c) => [String(c.client_no).trim().toLowerCase(), c]));
  // nama (huruf kecil) -> id pemilik; dipakai untuk mendeteksi duplikat nama antar client berbeda
  const owner = new Map<string, string>((existing ?? []).map((c) => [String(c.company).trim().toLowerCase(), String(c.id)]));
  const nameOf = new Map<string, string>((existing ?? []).map((c) => [String(c.id), String(c.company).trim().toLowerCase()]));
  const seenIds = new Set<string>();

  const errors: ImportResult['errors'] = [];
  const adds: Record<string, unknown>[] = [];
  const upds: { id: string; data: Record<string, unknown> }[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const no = s(r.client_no);
    const match = no ? byNo.get(no.toLowerCase()) : undefined;
    if (no) {
      if (seenIds.has(no.toLowerCase())) { err(`Client ID "${no}" muncul lebih dari sekali di file.`); continue; }
    }
    const selfId = match ? String(match.id) : '';
    const company = s(r.company);
    if (!company) { err('Company Name wajib diisi.'); continue; }
    const owned = owner.get(company.toLowerCase());
    if (owned && owned !== selfId) { err(`Client "${company}" sudah ada atau duplikat di file.`); continue; }
    let status = 'Unverified';
    if (s(r.status)) {
      const st = pickOption(r.status, STATUSES);
      if (!st) { err(`Status harus salah satu dari: ${STATUSES.join(', ')}.`); continue; }
      status = st;
    }
    let category: string | null = null;
    if (s(r.category)) {
      const cat = pickOption(r.category, cats);
      if (!cat) { err(`Category "${s(r.category)}" belum ada di menu Client Category${cats.length ? `. Pilihan: ${cats.join(', ')}` : ''}.`); continue; }
      category = cat;
    }
    let credit: number | null = null;
    if (s(r.credit_limit)) {
      credit = parseNum(r.credit_limit);
      if (credit == null || Number.isNaN(credit) || credit < 0) { err('Credit Limit harus berupa angka (tanpa huruf).'); continue; }
    }
    const c1 = { name: s(r.contact_name), position: s(r.position), phone: s(r.phone), email: s(r.email) };
    const c2 = { name: s(r.contact2_name), position: s(r.contact2_position), phone: s(r.contact2_phone), email: s(r.contact2_email) };
    if ((c1.email && !emailOk(c1.email)) || (c2.email && !emailOk(c2.email))) { err('Format email tidak valid.'); continue; }
    const filled = (c: typeof c1) => !!(c.name || c.position || c.phone || c.email);
    let contacts = [c1, c2].filter(filled);
    if (match) {
      // Kontak ke-3 dst. (hanya bisa diubah lewat form) dipertahankan; kontak 1–2 ditimpa isi file.
      const old = Array.isArray(match.contacts) ? (match.contacts as typeof c1[]) : [];
      const has2 = r.contact2_name !== undefined || r.contact2_position !== undefined || r.contact2_phone !== undefined || r.contact2_email !== undefined;
      const has1 = r.contact_name !== undefined || r.position !== undefined || r.phone !== undefined || r.email !== undefined;
      const first = has1 ? c1 : (old[0] ?? { name: '', position: '', phone: '', email: '' });
      const second = has2 ? c2 : (old[1] ?? { name: '', position: '', phone: '', email: '' });
      contacts = [first, second].filter(filled).concat(old.slice(2));
    }

    const payload = {
      company, address: s(r.address) || null, category, status, credit_limit: credit,
      contact_name: c1.name || null, position: c1.position || null, phone: c1.phone || null, email: c1.email || null,
      contacts,
    };
    if (no) seenIds.add(no.toLowerCase());
    if (match) {
      const oldKey = nameOf.get(selfId);
      if (oldKey) owner.delete(oldKey);
      owner.set(company.toLowerCase(), selfId); nameOf.set(selfId, company.toLowerCase());
      const data = pruneAbsent(payload, r, {
        address: ['address'], category: ['category'], status: ['status'], credit_limit: ['credit_limit'],
        contact_name: ['contact_name'], position: ['position'], phone: ['phone'], email: ['email'],
        contacts: ['contact_name', 'position', 'phone', 'email', 'contact2_name', 'contact2_position', 'contact2_phone', 'contact2_email'],
      });
      upds.push({ id: selfId, data });
    } else {
      owner.set(company.toLowerCase(), `new:${r._row}`);
      adds.push({ ...(no ? { client_no: no } : {}), ...payload });
    }
  }

  const result: ImportResult = { total: rows.length, valid: adds.length + upds.length, errors, added: adds.length, updated: upds.length };
  if (!commit || result.valid === 0) return result;
  if (adds.length) { const denied = await guard('/dashboard/clients', 'create'); if (denied) return { ...result, error: denied }; }
  if (upds.length) { const denied = await guard('/dashboard/clients', 'edit'); if (denied) return { ...result, error: denied }; }

  if (adds.length) {
    let { error } = await supabase.from('clients').insert(adds);
    if (error && /(contacts|category)/i.test(error.message)) {
      // Kolom contacts (0035) / category (0041) belum ada: simpan tanpa kolom tersebut.
      ({ error } = await supabase.from('clients').insert(adds.map(({ contacts: _c, category: _k, ...rest }) => rest)));
    }
    if (error) return { ...result, error: error.message };
  }
  const updErr = await inChunks(upds, 20, async (u) => {
    let { error } = await supabase.from('clients').update(u.data).eq('id', u.id);
    if (error && /(contacts|category)/i.test(error.message)) {
      const { contacts: _c, category: _k, ...rest } = u.data;
      ({ error } = await supabase.from('clients').update(rest).eq('id', u.id));
    }
    return error ? error.message : null;
  });
  if (updErr) return { ...result, error: 'Sebagian data gagal diperbarui: ' + updErr };
  revalidatePath('/dashboard/clients');
  return { ...result, inserted: adds.length + upds.length };
}
