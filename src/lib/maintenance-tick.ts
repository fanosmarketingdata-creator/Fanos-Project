import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseMaintenance, resetMaintenanceCache, isLocked } from '@/lib/maintenance';
import { sendPushToAll } from '@/lib/push';

const fmt = (iso: string, lang: string) => new Date(iso).toLocaleString(lang, { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB';

export async function pushMaintenanceStarted(etaIso: string) {
  const hasEta = !Number.isNaN(Date.parse(etaIso));
  return sendPushToAll({
    title: 'Maintenance dimulai / Maintenance started',
    body: `Sistem sedang dalam perbaikan dan sementara tidak dapat diakses.${hasEta ? ` Perkiraan selesai ${fmt(etaIso, 'id-ID')}.` : ''}\nThe system is under maintenance and temporarily unavailable.${hasEta ? ` Estimated completion ${fmt(etaIso, 'en-US')}.` : ''}`,
    tag: 'fanos-maintenance-start',
  });
}

export async function pushMaintenanceFinished() {
  return sendPushToAll({
    title: 'Maintenance selesai / Maintenance finished',
    body: 'Sistem sudah dapat diakses kembali. Terima kasih atas kesabaran Anda.\nThe system is available again. Thank you for your patience.',
    tag: 'fanos-maintenance-end',
  });
}

// Dipanggil berkala (polling klien yang sedang terbuka dan/atau cron eksternal) dan setelah Superuser menyimpan.
// Mengirim notifikasi perangkat sekali saja saat maintenance MULAI dan saat SELESAI; penanda disimpan di app_settings.
export async function maintenanceTick(): Promise<{ started?: boolean; finished?: boolean }> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (!data) return {};
    const m = parseMaintenance(data.value);
    if (!m.on) return {};
    const now = Date.now();
    const endMs = Date.parse(m.eta);
    const ended = !Number.isNaN(endMs) && endMs <= now;
    const startMs = m.scheduledAt ? Date.parse(m.scheduledAt) : 0;
    const begun = !m.scheduledAt || Number.isNaN(startMs) || startMs <= now;
    const out: { started?: boolean; finished?: boolean } = {};

    const needStart = isLocked(m, now) && !m.startNotified;
    const needEnd = begun && ended && !m.endNotified;
    if (!needStart && !needEnd) return {};

    // Tulis penanda DULU (mencegah kiriman ganda dari panggilan bersamaan), baru kirim.
    const next = { ...(data.value as object), startNotified: m.startNotified || needStart || needEnd, endNotified: m.endNotified || needEnd };
    await admin.from('app_settings').update({ value: next }).eq('key', 'maintenance');
    resetMaintenanceCache();
    if (needStart) { await pushMaintenanceStarted(m.eta); out.started = true; }
    if (needEnd) { await pushMaintenanceFinished(); out.finished = true; }
    return out;
  } catch {
    return {};
  }
}
