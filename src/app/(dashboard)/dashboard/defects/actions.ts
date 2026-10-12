'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type DefectInput = {
  id?: string;
  inspection_date: string;
  sales_order_id?: string;
  sku: string;
  qty: number;
  description?: string;
  status: 'OPEN' | 'RESOLVED';
};

export async function saveDefect(input: DefectInput) {
  if (!input.sku?.trim()) return { error: 'SKU wajib diisi' };
  if (!input.inspection_date) return { error: 'Tanggal pemeriksaan wajib diisi' };
  if (!(input.qty > 0)) return { error: 'Qty harus lebih dari 0' };

  const supabase = createClient();
  const payload = {
    inspection_date: input.inspection_date,
    sales_order_id: input.sales_order_id || null,
    sku: input.sku.trim(),
    qty: input.qty,
    description: input.description || null,
    status: input.status,
  };

  const query = input.id
    ? supabase.from('defects').update(payload).eq('id', input.id)
    : supabase.from('defects').insert(payload);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath('/dashboard/defects');
  return { success: true };
}

export async function toggleDefectStatus(id: string, current: string) {
  const supabase = createClient();
  const next = current === 'OPEN' ? 'RESOLVED' : 'OPEN';
  const { error } = await supabase.from('defects').update({ status: next }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/defects');
  return { success: true, status: next };
}

export async function deleteDefect(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('defects').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/defects');
  return { success: true };
}
