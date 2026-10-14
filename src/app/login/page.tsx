'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'idle') {
      setInfo('Sesi berakhir karena tidak ada aktivitas selama 12 jam. Silakan masuk kembali.');
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!email || !password) {
      setError('Email dan password harus diisi');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError('Email atau password salah');
      return;
    }

    // Auth berhasil: Supabase menyimpan session di cookie httpOnly secara
    // otomatis. router.refresh() membuat middleware jalan ulang lalu
    // Next.js akan redirect ke /dashboard — tidak perlu trik window.top
    // navigation atau tombol "lanjutkan manual" seperti sistem lama, karena
    // ini navigasi Next.js biasa (bukan iframe sandbox Apps Script).
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div
        className="pointer-events-none absolute -left-1/5 -top-[30%] h-[80%] w-[80%] rounded-[60%_40%_50%_50%] bg-gradient-to-br from-brand-500/30 via-brand-500/20 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[30%] -right-1/5 h-[80%] w-[80%] rounded-[50%_50%_60%_40%] bg-gradient-to-bl from-indigo-500/25 via-purple-500/15 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://drive.google.com/thumbnail?id=1Rmp8UB-1AVV5CAdfhl-kGSqAa65wINXT"
            alt="Fanos Logo"
            className="h-[70px] w-auto drop-shadow"
          />
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-[20px] border border-white/30 bg-white/90 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
        >
          <h1 className="mb-5 text-center text-xl font-bold text-brand-900">Masuk</h1>
          {info && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{info}</p>}

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
              placeholder="nama@perusahaan.com"
              autoComplete="username"
            />
          </div>

          <div className="mb-1.5">
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-xl border-2 bg-slate-50 px-4 py-3 pr-11 text-sm outline-none transition focus:bg-white focus:ring-4 focus:ring-brand-500/10 ${
                  error ? 'border-red-400 bg-red-50' : 'border-slate-200 focus:border-brand-500'
                }`}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.9 19.9 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {error && <p className="mt-1.5 text-[11px] font-medium text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-brand-500/30 transition hover:from-brand-600 hover:to-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
