'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type WarehouseInput = { id?: string; code?: string; name: string; address?: string; is_default?: boolean; is_active?: boolean };

export async function saveWarehouse(input: WarehouseInput) {
  const name = input.name?.trim();
  if (!name) return { error: 'Kolom Nama Gudang wajib diisi.' };
  const supabase = createClient();
  const payload = { code: input.code?.trim() || null, name, address: input.address?.trim() || null, is_default: !!input.is_default, is_active: input.is_default ? true : input.is_active !== false };

  if (payload.is_default) await supabase.from('warehouses').update({ is_default: false }).neq('id', input.id ?? '00000000-0000-0000-0000-000000000000');
  const { error } = input.id ? await supabase.from('warehouses').update(payload).eq('id', input.id) : await supabase.from('warehouses').insert(payload);
  if (error) return { error: error.code === '23505' ? 'Nama atau kode gudang sudah terdaftar.' : error.message };

  // Harus selalu ada satu gudang default yang aktif.
  const { data: def } = await supabase.from('warehouses').select('id').eq('is_default', true).limit(1);
  if (!def?.length) {
    const { data: first } = await supabase.from('warehouses').select('id').eq('is_active', true).order('created_at').limit(1);
    if (first?.[0]) await supabase.from('warehouses').update({ is_default: true }).eq('id', first[0].id);
  }
  revalidatePath('/dashboard/warehouse');
  return { success: true };
}

export async function deleteWarehouse(id: string) {
  const supabase = createClient();
  const [{ count: mv }, { count: tr }, { count: adj }] = await Promise.all([
    supabase.from('stock_movements').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
    supabase.from('stock_transfers').select('id', { count: 'exact', head: true }).or(`from_warehouse_id.eq.${id},to_warehouse_id.eq.${id}`),
    supabase.from('stock_adjustments').select('id', { count: 'exact', head: true }).eq('warehouse_id', id),
  ]);
  if ((mv ?? 0) + (tr ?? 0) + (adj ?? 0) > 0) return { error: 'Gudang ini sudah memiliki transaksi stok sehingga tidak dapat dihapus. Nonaktifkan saja bila tidak dipakai lagi.' };
  const { data: w } = await supabase.from('warehouses').select('is_default').eq('id', id).single();
  if (w?.is_default) return { error: 'Gudang default tidak dapat dihapus. Jadikan gudang lain sebagai default terlebih dahulu.' };
  const { error } = await supabase.from('warehouses').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/warehouse');
  return { success: true };
}
