'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { FINANCE_KINDS, rupiahLabel, type FinanceKind, type FinanceOption } from '@/lib/finance';

const PATHS: Record<FinanceKind, string> = {
  discount: '/dashboard/discounts', tax: '/dashboard/taxes', cashback: '/dashboard/cashbacks',
  payment_method: '/dashboard/payment-methods', payment_term: '/dashboard/payment-terms', credit_limit: '/dashboard/credit-limits',
};

export async function listFinanceOptions(kinds: FinanceKind[]): Promise<FinanceOption[]> {
  const supabase = createClient();
  const { data } = await supabase.from('finance_options').select('id, kind, name, value').in('kind', kinds).order('name');
  return ((data ?? []) as FinanceOption[]).map((r) => ({ ...r, value: r.value == null ? null : Number(r.value) }));
}

export async function saveFinanceOption(input: { id?: string; kind: FinanceKind; name: string; value?: number | null }) {
  const cfg = FINANCE_KINDS[input.kind];
  if (!cfg) return { error: 'Jenis data tidak dikenal.' };
  let name = (input.name ?? '').trim();
  let value: number | null = null;
  if (cfg.mode !== 'none') {
    value = Number(input.value);
    if (!Number.isFinite(value) || value < 0 || (input.value as unknown) === '' || input.value == null) return { error: `Kolom ${cfg.valueLabel} wajib diisi.` };
    if (cfg.mode === 'percent' && value > 100) return { error: 'Persentase maksimal 100.' };
  }
  if (input.kind === 'credit_limit' && !name) name = value === 0 ? 'Tanpa Kredit (Cash)' : rupiahLabel(value as number);
  if (!name) return { error: `Kolom ${cfg.nameLabel} wajib diisi.` };

  const supabase = createClient();
  const payload = { kind: input.kind, name, value };
  const q = input.id
    ? supabase.from('finance_options').update(payload).eq('id', input.id).select('id, kind, name, value').single()
    : supabase.from('finance_options').insert(payload).select('id, kind, name, value').single();
  const { data, error } = await q;
  if (error) return { error: error.code === '23505' ? 'Data tersebut sudah terdaftar.' : error.message };

  revalidatePath(PATHS[input.kind]);
  return { success: true, option: { ...data, value: data.value == null ? null : Number(data.value) } as FinanceOption };
}

export async function deleteFinanceOption(id: string, kind: FinanceKind) {
  const supabase = createClient();
  const { error } = await supabase.from('finance_options').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(PATHS[kind]);
  return { success: true };
}
