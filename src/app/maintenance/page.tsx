import { createClient } from '@/lib/supabase/server';
import { getMaintenance } from '@/lib/maintenance';
import MaintenanceActions from './MaintenanceActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sedang Dalam Perbaikan - Fanos ERP' };

export default async function MaintenancePage() {
  const m = await getMaintenance(createClient(), true);
  return (
    <div className="maint-wrap" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc', padding: 16, textAlign: 'center' }}>
      <div style={{ maxWidth: 460 }}>
        <div style={{ fontSize: 56 }}>🛠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '10px 0 8px' }}>Sistem Sedang Dalam Perbaikan</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
          {m.message || 'Kami sedang melakukan pemeliharaan sistem agar layanan menjadi lebih baik. Mohon coba lagi beberapa saat lagi.'}
        </p>
        {m.eta && <p style={{ fontSize: 14, color: '#0f172a', fontWeight: 700, marginBottom: 8 }}>Perkiraan selesai: <span data-no-i18n>{m.eta}</span></p>}
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Terima kasih atas pengertian Anda.</p>
        <MaintenanceActions />
      </div>
    </div>
  );
}
