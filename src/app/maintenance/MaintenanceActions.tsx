'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const btn = { display: 'inline-block', background: '#3563e9', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, border: 0, cursor: 'pointer' } as const;

export default function MaintenanceActions() {
  // Cek ulang otomatis tiap 30 detik; begitu maintenance selesai, middleware akan mengarahkan ke dashboard.
  useEffect(() => {
    const t = setInterval(() => window.location.reload(), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      <button type="button" style={btn} onClick={() => window.location.reload()}>Muat Ulang</button>
      <button type="button" style={{ ...btn, background: '#e2e8f0', color: '#334155' }} onClick={async () => { await createClient().auth.signOut(); window.location.href = '/login'; }}>Keluar</button>
    </div>
  );
}
