'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const btn = { display: 'inline-block', background: '#fff', color: '#0f172a', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, border: 0, cursor: 'pointer' } as const;

export default function MaintenanceActions() {
  // Cek diam-diam (tanpa memuat ulang halaman, supaya animasi island tidak mengulang): bila /dashboard sudah tidak 503, pindah ke dashboard.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        fetch('/api/maintenance/tick', { method: 'POST' }).catch(() => {});
        const res = await fetch('/dashboard', { method: 'HEAD', cache: 'no-store' });
        if (alive && res.status !== 503 && res.status < 500) window.location.href = '/dashboard';
      } catch { /* abaikan, coba lagi nanti */ }
    };
    const t = setInterval(check, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button type="button" style={btn} onClick={() => window.location.reload()}>Muat Ulang</button>
      <button type="button" style={{ ...btn, background: 'rgba(255,255,255,.14)', color: '#fff' }} onClick={async () => { await createClient().auth.signOut(); window.location.href = '/login'; }}>Keluar</button>
    </div>
  );
}
