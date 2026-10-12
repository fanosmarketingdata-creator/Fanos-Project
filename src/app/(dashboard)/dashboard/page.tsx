import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  // Superuser hanya punya menu Superuser, jadi langsung diarahkan ke sana.
  if (profile?.role === 'Superuser') redirect('/dashboard/team-members');

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Overview</h1>
      <p className="mb-6 text-sm text-slate-500">Selamat datang, {profile?.full_name ?? ''}.</p>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        Dashboard ringkasan (KPI, grafik) akan dibangun di Fase 8 bersama cetak PDF dan polish UI.
      </div>
    </div>
  );
}
