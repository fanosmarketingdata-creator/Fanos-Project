import { cookies } from 'next/headers';
import { LANG_COOKIE, parseLang } from '@/lib/i18n/lang';
import { createClient } from '@/lib/supabase/server';
import { getMaintenance } from '@/lib/maintenance';
import MaintenanceIsland from '@/components/MaintenanceIsland';
import MaintenanceActions from './MaintenanceActions';

export const dynamic = 'force-dynamic';
// Judul tab mengikuti bahasa yang dipilih (cookie lang).
export function generateMetadata() {
  const lang = parseLang(cookies().get(LANG_COOKIE)?.value);
  return { title: lang === 'en' ? 'Under Maintenance - Fanos ERP' : 'Sedang Dalam Perbaikan - Fanos ERP' };
}

export default async function MaintenancePage() {
  const m = await getMaintenance(createClient(), true);
  return (
    <div className="maint-wrap" style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #e8eefc 0%, #f6f8fc 60%)', padding: 16 }}>
      <MaintenanceIsland
        variant="page"
        gears
        title="Sistem Sedang Dalam Perbaikan"
        message="Kami sedang melakukan peningkatan sistem. Mohon maaf atas ketidaknyamanan ini."
        eta={m.eta}
      >
        <p className="mi-thanks">Terima kasih atas pengertian Anda.</p>
        <MaintenanceActions />
      </MaintenanceIsland>
    </div>
  );
}
