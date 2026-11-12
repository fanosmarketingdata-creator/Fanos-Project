'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseMaintenance, isLocked, type Maintenance } from '@/lib/maintenance';
import MaintenanceIsland from '@/components/MaintenanceIsland';
import { useLang } from '@/components/I18nProvider';

function remaining(iso: string, now: number, en: boolean) {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return '';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return en ? `in ${m} min` : `${m} menit lagi`;
  const h = Math.floor(m / 60);
  if (h < 24) return en ? `in ${h} h ${m % 60} min` : `${h} jam ${m % 60} menit lagi`;
  const d = Math.floor(h / 24);
  return en ? `in ${d} day${d > 1 ? 's' : ''}` : `${d} hari lagi`;
}

// Peringatan dini di dashboard: jadwal maintenance mendatang (semua pengguna) atau status AKTIF (hanya Superuser yang bisa melihatnya).
export default function MaintenanceNotice({ isSuperuser }: { isSuperuser: boolean }) {
  const en = useLang() === 'en';
  const [m, setM] = useState<Maintenance | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    const load = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
        if (alive && data) {
          const v = parseMaintenance(data.value);
          setM(v);
          // Pemicu notifikasi perangkat saat maintenance mulai/selesai (idempoten di server).
          if (v.on) fetch('/api/maintenance/tick', { method: 'POST' }).catch(() => {});
        }
      } catch { /* abaikan */ }
    };
    load();
    const a = setInterval(load, 60000);
    const b = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(a); clearInterval(b); };
  }, []);

  // Waktunya tiba saat pengguna masih membuka dashboard: arahkan non-Superuser ke halaman maintenance.
  const locked = !!m && isLocked(m, now);
  useEffect(() => {
    if (locked && !isSuperuser) window.location.reload();
  }, [locked, isSuperuser]);

  if (!m) return null;
  if (locked) {
    return <MaintenanceIsland key="on" variant="notice" tone="danger" title="Maintenance AKTIF" subtitle={en ? 'Superuser only' : 'Hanya Superuser'} message="Pengguna lain tidak dapat mengakses sistem saat ini." eta={m.eta} />;
  }
  if (m.scheduledAt && Date.parse(m.scheduledAt) > now) { // peringatan dini
    return <MaintenanceIsland key="sched" variant="notice" title="Maintenance terjadwal" subtitle={remaining(m.scheduledAt, now, en)} message="Maintenance akan segera dimulai. Mohon simpan pekerjaan Anda sebelum jadwal dimulai." scheduledAt={m.scheduledAt} eta={m.eta} />;
  }
  return null;
}
