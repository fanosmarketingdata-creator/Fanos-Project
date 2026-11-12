'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSuperuserOrNull, NOT_SUPERUSER_ERROR } from '@/lib/auth';
import { resetMaintenanceCache } from '@/lib/maintenance';

export async function saveMaintenance(input: { on: boolean; message: string; eta: string; scheduledAt: string }) {
  if (!(await getSuperuserOrNull())) return { error: NOT_SUPERUSER_ERROR };
  const supabase = createClient();
  const value = { on: !!input.on, message: String(input.message ?? '').trim().slice(0, 500), eta: String(input.eta ?? '').trim().slice(0, 100), scheduledAt: Number.isNaN(Date.parse(input.scheduledAt)) ? '' : new Date(input.scheduledAt).toISOString() };
  const { error } = await supabase.from('app_settings').upsert({ key: 'maintenance', value, updated_at: new Date().toISOString() });
  if (error) return { error: /app_settings/.test(error.message) ? 'Tabel app_settings belum ada. Jalankan migrasi 0042 di Supabase SQL Editor.' : error.message };
  resetMaintenanceCache();
  revalidatePath('/dashboard/maintenance');
  return { ok: true as const };
}
