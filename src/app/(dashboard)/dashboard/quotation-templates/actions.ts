'use server';
import { friendlyError } from '@/lib/db-error';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';

const HREF = '/dashboard/quotation-templates';

export type TermsTemplate = { id: string; name: string; lang: 'id' | 'en'; content: string; is_default: boolean };

export async function saveTermsTemplate(input: { id?: string; name: string; lang: 'id' | 'en'; content: string; is_default: boolean }) {
  { const denied = await guard(HREF, 'save', input); if (denied) return { error: denied }; }
  const name = input.name?.trim();
  if (!name) return { error: 'Kolom Nama Template wajib diisi.' };
  if (!input.content || input.content.replace(/<[^>]*>/g, '').trim() === '') return { error: 'Isi Syarat & Ketentuan wajib diisi.' };

  const supabase = createClient();
  // Hanya satu template bawaan: lepas tanda bawaan dari yang lain lebih dulu.
  if (input.is_default) {
    const q = supabase.from('quotation_terms_templates').update({ is_default: false }).eq('is_default', true);
    const { error: e0 } = input.id ? await q.neq('id', input.id) : await q;
    if (e0) return { error: friendlyError(e0) };
  }
  const payload = { name, lang: input.lang === 'en' ? 'en' : 'id', content: input.content, is_default: !!input.is_default, updated_at: new Date().toISOString() };
  const { error } = input.id
    ? await supabase.from('quotation_terms_templates').update(payload).eq('id', input.id)
    : await supabase.from('quotation_terms_templates').insert(payload);
  if (error) return { error: error.code === '23505' ? 'Nama template tersebut sudah terdaftar.' : error.message };

  revalidatePath(HREF);
  return { success: true };
}

export async function deleteTermsTemplate(id: string) {
  { const denied = await guard(HREF, 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { error } = await supabase.from('quotation_terms_templates').delete().eq('id', id);
  if (error) return { error: friendlyError(error) };
  revalidatePath(HREF);
  return { success: true };
}
