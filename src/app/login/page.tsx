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
      setInfo('Sesi Anda telah berakhir karena tidak ada aktivitas selama 12 jam. Silakan masuk kembali.');
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError('Email atau kata sandi tidak sesuai. Mohon periksa kembali.');
        setPassword('');
        setLoading(false);
        return;
      }
      // Overlay tetap tampil sampai halaman dashboard terbuka.
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server. Mohon coba kembali beberapa saat lagi.');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-aurora" aria-hidden="true">
        <span className="a1" />
        <span className="a2" />
        <span className="a3" />
        <span className="a4" />
      </div>
      {loading && (
        <div className="login-overlay">
          <div className="spinner" />
          <p>Sedang Memverifikasi Akun</p>
          <span className="sub-text">Mohon menunggu, sistem sedang memeriksa kredensial Anda.</span>
        </div>
      )}

      <div className="login-container">
        <div className="login-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://drive.google.com/thumbnail?id=1Rmp8UB-1AVV5CAdfhl-kGSqAa65wINXT" alt="Logo" />
        </div>
        <div className="login-content">
          {info && <p className="login-info">{info}</p>}
          <form onSubmit={handleLogin} noValidate>
            <div className="login-required">
              <input
                type="email"
                id="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoFocus
              />
              <label htmlFor="email">Email</label>
            </div>

            <div className="login-required">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                data-has-toggle="1"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={error ? 'warning' : ''}
                autoComplete="current-password"
              />
              <label htmlFor="password">Kata Sandi</label>
              <button type="button" className="toggle-eye" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label="Tampilkan kata sandi">
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.9 19.9 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
              <span className={`warning-text${error ? ' show' : ''}`}>{error}</span>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
