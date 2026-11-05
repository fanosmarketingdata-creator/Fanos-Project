'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import type { ImportResult, ImportRow } from '@/lib/bulk-import';
import { s, pickOption, emailOk, checkSize } from '@/lib/bulk-server';
import { TOP_OPTIONS } from '@/lib/master-options';

export async function importVendors(rows: ImportRow[], commit: boolean): Promise<ImportResult> {
  { const denied = await guard('/dashboard/vendors', 'create'); if (denied) return { total: rows.length, valid: 0, errors: [], error: denied }; }
  const bad = checkSize(rows);
  if (bad) return bad;

  const supabase = createClient();
  const { data: existing } = await supabase.from('vendors').select('company');
  const seen = new Set((existing ?? []).map((c) => String(c.company).trim().toLowerCase()));
  const tops = TOP_OPTIONS.map((t) => (typeof t === 'string' ? t : (t as { value: string }).value));

  const errors: ImportResult['errors'] = [];
  const good: Record<string, unknown>[] = [];
  for (const r of rows) {
    const err = (m: string) => errors.push({ row: r._row, message: m });
    const company = s(r.company);
    if (!company) { err('Nama Perusahaan wajib diisi.'); continue; }
    if (seen.has(company.toLowerCase())) { err(`Vendor "${company}" sudah ada atau duplikat di file.`); continue; }
    let top: string | null = null;
    if (s(r.top)) {
      top = pickOption(r.top, tops);
      if (!top) { err(`TOP harus salah satu dari: ${tops.join(', ')}.`); continue; }
    }
    if (s(r.email) && !emailOk(s(r.email))) { err('Format email tidak valid.'); continue; }
    seen.add(company.toLowerCase());
    good.push({
      company, contact_name: s(r.contact_name) || null, position: s(r.position) || null, top,
      phone: s(r.phone) || null, email: s(r.email) || null, address: s(r.address) || null,
    });
  }

  const result: ImportResult = { total: rows.length, valid: good.length, errors };
  if (!commit || good.length === 0) return result;
  const { error } = await supabase.from('vendors').insert(good);
  if (error) return { ...result, error: error.message };
  revalidatePath('/dashboard/vendors');
  return { ...result, inserted: good.length };
}
