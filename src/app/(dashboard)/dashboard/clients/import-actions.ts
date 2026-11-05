'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, parseNum, pickOption, emailOk, checkSize } from '@/lib/bulk-server';

const STATUSES = ['Active', 'Inactive', 'Blacklist', 'Unverified'];

export async function importClients(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/clients', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const { data: existing } = await supabase.from('clients').select('company');
  const seen = new Set((existing ?? []).map((c) => String(c.company).trim().toLowerCase()));

  const errors: ImportResult['errors'] = [];
  const good: Record<string, unknown>[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const company = s(r.company);
    if (!company) { err('Company Name wajib diisi.'); continue; }
    if (seen.has(company.toLowerCase())) { err(`Client "${company}" sudah ada atau duplikat di file.`); continue; }
    let status = 'Unverified';
    if (s(r.status)) {
      const st = pickOption(r.status, STATUSES);
      if (!st) { err(`Status harus salah satu dari: ${STATUSES.join(', ')}.`); continue; }
      status = st;
    }
    let credit: number | null = null;
    if (s(r.credit_limit)) {
      credit = parseNum(r.credit_limit);
      if (credit == null || Number.isNaN(credit) || credit < 0) { err('Credit Limit harus berupa angka (tanpa huruf).'); continue; }
    }
    const c1 = { name: s(r.contact_name), position: s(r.position), phone: s(r.phone), email: s(r.email) };
    const c2 = { name: s(r.contact2_name), position: s(r.contact2_position), phone: s(r.contact2_phone), email: s(r.contact2_email) };
    if ((c1.email && !emailOk(c1.email)) || (c2.email && !emailOk(c2.email))) { err('Format email tidak valid.'); continue; }
    const contacts = [c1, c2].filter((c) => c.name || c.position || c.phone || c.email);
    seen.add(company.toLowerCase());
    good.push({
      company, address: s(r.address) || null, status, credit_limit: credit,
      contact_name: c1.name || null, position: c1.position || null, phone: c1.phone || null, email: c1.email || null,
      contacts,
    });
  }

  const result: ImportResult = { total: rows.length, valid: good.length, errors };
  if (!commit || good.length === 0) return result;

  let { error } = await supabase.from('clients').insert(good);
  if (error && /contacts/i.test(error.message)) {
    // Kolom contacts belum ada (migrasi 0035): simpan kontak utama saja.
    ({ error } = await supabase.from('clients').insert(good.map(({ contacts: _c, ...rest }) => rest)));
  }
  if (error) return { ...result, error: error.message };
  revalidatePath('/dashboard/clients');
  return { ...result, inserted: good.length };
}
