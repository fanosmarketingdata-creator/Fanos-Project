'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function InactiveNotice() {
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
          ⛔
        </div>
        <h1 className="mb-2 text-base font-bold text-slate-800">Akun Dinonaktifkan</h1>
        <p className="mb-6 text-sm leading-relaxed text-slate-500">
          Akun Anda sudah dinonaktifkan oleh administrator. Hubungi Superuser jika ini keliru.
        </p>
        <button
          onClick={handleLogout}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
