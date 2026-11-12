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
      <p className="mb-6 text-sm text-slate-500">Saat mode maintenance aktif, semua pengguna selain Superuser tidak dapat mengakses sistem dan melihat halaman pemberitahuan. Superuser tetap dapat masuk untuk melakukan perbaikan. Bila Jadwal mulai diisi, semua pengguna melihat peringatan dini dengan hitung mundur, dan baru diarahkan ke halaman maintenance saat jadwal tiba (otomatis). Tanpa jadwal, maintenance berlaku langsung. Bila Perkiraan selesai diisi, maintenance berakhir otomatis pada tanggal & jam tersebut dan sistem kembali dapat diakses.</p>
      <MaintenanceForm initial={m} />
    </div>
  );
}
