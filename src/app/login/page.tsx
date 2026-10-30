'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FigmaCursor from '@/components/FigmaCursor';
import UpdateAnnouncementModal from '@/components/UpdateAnnouncementModal';
import { useLang } from '@/components/I18nProvider';
import { setLang } from '@/lib/i18n/lang';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const lang = useLang();
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
    <div className="login-page login-split">
      <FigmaCursor name="Tamu" />
      <UpdateAnnouncementModal />
      {loading && (
        <div className="login-overlay">
          <div className="spinner" />
          <p>Memverifikasi...</p>
          <span className="sub-text">Mohon menunggu</span>
        </div>
      )}

      <div className="login-left">
        <div className="login-aurora" aria-hidden="true">
          <span className="a1" />
          <span className="a2" />
          <span className="a3" />
          <span className="a4" />
        </div>
        <div className="login-container">
          <div className="login-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-fanos-wordmark.png" alt="Fanos" />
          </div>
          <h1 className="login-title">Selamat Datang</h1>
          <p className="login-sub">Silakan masuk dengan email dan kata sandi Anda</p>
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
          <div data-no-i18n style={{ marginTop: 14, textAlign: 'center', fontSize: 12 }}>
            <button type="button" onClick={() => setLang('en')} style={{ fontWeight: lang === 'en' ? 700 : 400, opacity: lang === 'en' ? 1 : 0.7 }}>English</button>
            {' | '}
            <button type="button" onClick={() => setLang('id')} style={{ fontWeight: lang === 'id' ? 700 : 400, opacity: lang === 'id' ? 1 : 0.7 }}>Bahasa Indonesia</button>
          </div>
          </div>
        </div>
      </div>
      <div className="login-right" aria-hidden="true">
        <div className="login-right-shade" />
      </div>
    </div>
  );
}
