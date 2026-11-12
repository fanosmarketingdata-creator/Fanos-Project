'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseMaintenance, type Maintenance } from '@/lib/maintenance';
import MaintenanceIsland from '@/components/MaintenanceIsland';

function remaining(iso: string, now: number) {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return '';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m} menit lagi`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam ${m % 60} menit lagi`;
  return `${Math.floor(h / 24)} hari lagi`;
}

// Peringatan dini di dashboard: jadwal maintenance mendatang (semua pengguna) atau status AKTIF (hanya Superuser yang bisa melihatnya).
export default function MaintenanceNotice() {
  const [m, setM] = useState<Maintenance | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    const load = async () => {
      try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'maintenance').maybeSingle();
        if (alive && data) setM(parseMaintenance(data.value));
      } catch { /* abaikan */ }
    };
    load();
    const a = setInterval(load, 60000);
    const b = setInterval(() => setNow(Date.now()), 30000);
    return () => { alive = false; clearInterval(a); clearInterval(b); };
  }, []);

  if (!m) return null;
  if (m.on) {
    return <MaintenanceIsland key="on" variant="notice" tone="danger" title="Maintenance AKTIF" subtitle="Hanya Superuser" message={m.message || 'Pengguna lain tidak dapat mengakses sistem saat ini.'} eta={m.eta} />;
  }
  if (m.scheduledAt && Date.parse(m.scheduledAt) > now) {
    return <MaintenanceIsland key="sched" variant="notice" title="Maintenance terjadwal" subtitle={remaining(m.scheduledAt, now)} message={m.message || 'Mohon simpan pekerjaan Anda sebelum jadwal maintenance dimulai.'} scheduledAt={m.scheduledAt} eta={m.eta} />;
  }
  return null;
}
