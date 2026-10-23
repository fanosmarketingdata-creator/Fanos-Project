'use server';

import { createClient } from '@/lib/supabase/server';

// Daftar gudang aktif + gudang default, untuk dropdown di berbagai form.
export async function getWarehouseOptions() {
  const supabase = createClient();
  const { data } = await supabase.from('warehouses').select('id, name, is_default').eq('is_active', true).order('created_at');
  const list = data ?? [];
  const def = list.find((w) => w.is_default)?.id ?? list[0]?.id ?? '';
  return { options: list.map((w) => ({ value: w.id as string, label: w.name as string })), defaultId: def as string };
}
