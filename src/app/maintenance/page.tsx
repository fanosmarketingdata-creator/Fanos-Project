import { createClient } from '@/lib/supabase/server';
import { getMaintenance } from '@/lib/maintenance';
import MaintenanceIsland from '@/components/MaintenanceIsland';
import MaintenanceActions from './MaintenanceActions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sedang Dalam Perbaikan - Fanos ERP' };

export default async function MaintenancePage() {
  const m = await getMaintenance(createClient(), true);
  return (
    <div className="maint-wrap" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #e8eefc 0%, #f6f8fc 60%)', padding: 16 }}>
      <MaintenanceIsland
        variant="page"
        title="Sistem Sedang Dalam Perbaikan"
        message={m.message || 'Kami sedang melakukan pemeliharaan sistem agar layanan menjadi lebih baik. Mohon coba lagi beberapa saat lagi.'}
        eta={m.eta}
      >
        <p className="mi-thanks">Terima kasih atas pengertian Anda.</p>
        <MaintenanceActions />
      </MaintenanceIsland>
    </div>
  );
}
