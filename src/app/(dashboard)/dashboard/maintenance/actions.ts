'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSuperuserOrNull, NOT_SUPERUSER_ERROR } from '@/lib/auth';
import { resetMaintenanceCache, parseMaintenance, isLocked } from '@/lib/maintenance';
import { maintenanceTick, pushMaintenanceFinished } from '@/lib/maintenance-tick';
import { sendPushToAll } from '@/lib/push';

export async function saveMaintenance(input: { on: boolean; message: string; eta: string; scheduledAt: string }) {
  if (!(await getSuperuserOrNull())) return { error: NOT_SUPERUSER_ERROR };
  const supabase = createClient();
  const value = { on: !!input.on, message: String(input.message ?? '').trim().slice(0, 500), eta: String(input.eta ?? '').trim().slice(0, 100), scheduledAt: Number.isNaN(Date.parse(input.scheduledAt)) ? '' : new Date(input.scheduledAt).toISOString() };
  // Penanda notifikasi (mulai/selesai): reset bila jalannya baru atau perkiraan selesai berubah.
  const { data: prevRow } = await supabase.from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
  const prev = parseMaintenance(prevRow?.value);
  const newRun = value.on && (!prev.on || prev.scheduledAt !== value.scheduledAt);
  const flagged = { ...value, startNotified: newRun ? false : !!prev.startNotified, endNotified: newRun || prev.eta !== value.eta ? false : !!prev.endNotified };
  const { error } = await supabase.from('app_settings').upsert({ key: 'maintenance', value: flagged, updated_at: new Date().toISOString() });
  if (error) return { error: /app_settings/.test(error.message) ? 'Tabel app_settings belum ada. Jalankan migrasi 0042 di Supabase SQL Editor.' : error.message };
  resetMaintenanceCache();
  revalidatePath('/dashboard/maintenance');

  // Maintenance dijadwalkan (baru / jadwal berubah): beri notifikasi ke perangkat pengguna (Web Push), dua bahasa.
  let push: { sent: number; total: number; skipped?: string } | null = null;
  const start = Date.parse(value.scheduledAt);
  if (value.on && !Number.isNaN(start) && start > Date.now() && (!prev.on || prev.scheduledAt !== value.scheduledAt)) {
    const f = (lang: string) => new Date(start).toLocaleString(lang, { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';
    push = await sendPushToAll({
      title: 'Maintenance terjadwal / Scheduled maintenance',
      body: `Mulai ${f('id-ID')}. Mohon simpan pekerjaan Anda.\nStarts ${f('en-US')}. Please save your work.`,
    });
  }
  // Dimatikan manual saat sedang berjalan: kabari bahwa maintenance selesai. Selain itu, cek mulai/selesai sekarang juga.
  if (!value.on && prev.on && isLocked(prev) && prev.startNotified && !prev.endNotified) await pushMaintenanceFinished();
  else await maintenanceTick();
  return { ok: true as const, push };
}
