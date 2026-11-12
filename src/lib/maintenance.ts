// Status mode maintenance (aman dipakai di middleware/edge).
export type Maintenance = { on: boolean; message: string; eta: string; scheduledAt: string; startNotified?: boolean; endNotified?: boolean }; // scheduledAt: ISO (UTC) atau ''

type Q = { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: { value: unknown } | null }> } } } };

let cache: { at: number; v: Maintenance } | null = null;

export function parseMaintenance(v: unknown): Maintenance {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { on: o.on === true, message: typeof o.message === 'string' ? o.message : '', eta: typeof o.eta === 'string' ? o.eta : '', scheduledAt: typeof o.scheduledAt === 'string' ? o.scheduledAt : '', startNotified: o.startNotified === true, endNotified: o.endNotified === true };
}

// Env MAINTENANCE_MODE=1 = saklar darurat (tanpa database). Bila tabel belum ada / gagal dibaca: dianggap mati agar tidak mengunci semua orang.
export async function getMaintenance(supabase: unknown, fresh = false): Promise<Maintenance> {
  const forced = /^(1|true|on)$/i.test(process.env.MAINTENANCE_MODE ?? '');
  if (!fresh && cache && Date.now() - cache.at < 5000) return forced ? { ...cache.v, on: true, scheduledAt: '', eta: '' } : cache.v;
  let v: Maintenance = { on: false, message: '', eta: '', scheduledAt: '' };
  try {
    const { data } = await (supabase as Q).from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
    if (data) v = parseMaintenance(data.value);
  } catch { /* abaikan */ }
  cache = { at: Date.now(), v };
  return forced ? { ...v, on: true, scheduledAt: '', eta: '' } : v;
}

// Terkunci = saklar aktif DAN sudah waktunya (tanpa jadwal / jadwal lewat) DAN belum lewat perkiraan selesai.
// Aktif + jadwal di depan = hanya peringatan dini; pengguna baru diarahkan ke halaman maintenance pada jamnya.
export function isLocked(m: Maintenance, now = Date.now()) {
  if (!m.on) return false;
  // Sudah lewat perkiraan selesai → maintenance berakhir otomatis (teks bebas data lama diabaikan).
  const end = Date.parse(m.eta);
  if (!Number.isNaN(end) && end <= now) return false;
  if (!m.scheduledAt) return true;
  const t = Date.parse(m.scheduledAt);
  return Number.isNaN(t) || t <= now;
}

export function resetMaintenanceCache() { cache = null; }
