'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FigmaCursor from '@/components/FigmaCursor';
import UpdateAnnouncementModal from '@/components/UpdateAnnouncementModal';
import { useLang } from '@/components/I18nProvider';
import { setLang } from '@/lib/i18n/lang';
import { createClient } from '@/lib/supabase/client';
import { emailRegistered } from '@/lib/login-actions';
import AuroraBackground from '@/components/AuroraBackground';

export default function LoginPage() {
  const lang = useLang();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [phase, setPhase] = useState('');
  // Status kolom (hijau/merah) hanya muncul setelah tombol Masuk diklik.
  const [emailSt, setEmailSt] = useState<'' | 'ok' | 'bad'>('');
  const [passSt, setPassSt] = useState<'' | 'ok' | 'bad'>('');
  const [info, setInfo] = useState('');

  // Halaman login selalu tampil terang (tanpa dark mode); tema pengguna dipulihkan saat keluar.
  useEffect(() => {
    const root = document.documentElement;
    const was = root.classList.contains('dark');
    root.classList.remove('dark');
    const mo = new MutationObserver(() => { if (root.classList.contains('dark')) root.classList.remove('dark'); });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); if (was) root.classList.add('dark'); };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'idle') {
      setInfo('Sesi Anda telah berakhir karena tidak ada aktivitas selama 12 jam. Silakan masuk kembali.');
    }
  }, []);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setEmailErr('');
    setEmailSt('');
    setPassSt('');

    const mail = email.trim();
    // 1) Email dulu
    if (!mail) { setEmailSt('bad'); setEmailErr('Email wajib diisi.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { setEmailSt('bad'); setEmailErr('Format email tidak valid.'); return; }

    setLoading(true);
    setPhase('Memeriksa email...');
    await wait(450);
    try {
      const known = await emailRegistered(mail);
      if (!known) {
        setEmailSt('bad');
        setEmailErr('Email tidak terdaftar.');
        setPhase('');
        setLoading(false);
        return;
      }
      setEmailSt('ok');
      setPhase('Email benar');
      await wait(700);

      // 2) Lalu kata sandi
      if (!password) {
        setPassSt('bad');
        setError('Kata sandi wajib diisi.');
        setPhase('');
        setLoading(false);
        return;
      }
      setPhase('Memeriksa kata sandi...');
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (signInError) {
        setPassSt('bad');
        setError('Kata sandi salah. Mohon periksa kembali.');
        setPassword('');
        setPhase('');
        setLoading(false);
        return;
      }
      setPassSt('ok');
      setPhase('Kata sandi benar');
      await wait(700);
      setPhase('Membuka dashboard...');
      // Tombol tetap berputar sampai dashboard terbuka.
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Tidak dapat terhubung ke server. Mohon coba kembali beberapa saat lagi.');
      setPhase('');
      setLoading(false);
    }
  }

  return (
    <div className="login-page login-split">
      <FigmaCursor name="Tamu" />
      <UpdateAnnouncementModal />
      <div className="login-right">
        <AuroraBackground speed={1.0} />
      </div>

      <div className="login-left">
        <div className="login-card">
        <div className="login-image login-logo-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-fanos-wordmark.png" alt="Fanos" className="logo-light" />
          <img src="/logo-fanos-dark.png" alt="Fanos" className="logo-dark" />
        </div>
        <div className="login-container">
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
                onChange={(e) => { setEmail(e.target.value); setEmailSt(''); setEmailErr(''); }}
                className={emailSt === 'ok' ? 'valid' : emailSt === 'bad' ? 'warning' : ''}
                autoComplete="username"
                autoFocus
              />
              <label htmlFor="email">Email</label>
              <span className={`warning-text${emailErr ? ' show' : ''}`}>{emailErr}</span>
            </div>

            <div className="login-required">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                data-has-toggle="1"
                placeholder=" "
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPassSt(''); setError(''); }}
                className={passSt === 'ok' ? 'valid' : passSt === 'bad' ? 'warning' : ''}
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

            <button type="submit" className={`login-btn${loading ? ' is-loading' : ''}`} disabled={loading} aria-busy={loading} aria-label={loading ? 'Memverifikasi...' : undefined}>
              <span className="login-btn-label">Masuk</span>
              <span className="login-btn-spin" aria-hidden="true" />
            </button>
            <div className={`login-status${phase ? ' show' : ''}`} role="status" aria-live="polite">
              {phase && (
                <span key={phase} className="login-status-item">
                  {phase.endsWith('benar') ? <i className="fi fi-rr-check-circle ok" /> : <span className="login-status-dots" aria-hidden="true"><b /><b /><b /></span>}
                  {phase}
                </span>
              )}
            </div>
          </form>
          <div data-no-i18n style={{ marginTop: 14, textAlign: 'center', fontSize: 12 }}>
            <button type="button" onClick={() => setLang('en')} style={{ fontWeight: lang === 'en' ? 700 : 400, opacity: lang === 'en' ? 1 : 0.7 }}>English</button>
            {' | '}
            <button type="button" onClick={() => setLang('id')} style={{ fontWeight: lang === 'id' ? 700 : 400, opacity: lang === 'id' ? 1 : 0.7 }}>Bahasa Indonesia</button>
          </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
