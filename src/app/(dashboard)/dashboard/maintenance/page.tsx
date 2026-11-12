import { createClient } from '@/lib/supabase/server';
import { requireSuperuser } from '@/lib/auth';
import { getMaintenance } from '@/lib/maintenance';
import MaintenanceForm from './MaintenanceForm';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  await requireSuperuser();
  const m = await getMaintenance(createClient(), true);
  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-settings" />Maintenance</h1>
      <p className="mb-6 text-sm text-slate-500">Saat mode maintenance aktif, semua pengguna selain Superuser tidak dapat mengakses sistem dan melihat halaman pemberitahuan. Superuser tetap dapat masuk untuk melakukan perbaikan.</p>
      <MaintenanceForm initial={m} />
    </div>
  );
}
