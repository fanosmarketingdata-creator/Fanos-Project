'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const IDLE_LIMIT_MS = 12 * 60 * 60 * 1000; // 12 jam tanpa aktivitas -> logout otomatis
const CHECK_INTERVAL_MS = 30 * 1000;
const STORAGE_KEY = 'fanos_last_activity';
const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const;

// Waktu aktivitas terakhir disimpan di localStorage (bukan satu setTimeout
// 12 jam), lalu dicek berkala dengan membandingkan Date.now(). Cara ini
// tahan terhadap tab yang di-background / laptop sleep — timer panjang
// di JavaScript memang tidak bisa diandalkan untuk durasi sepanjang itu.
// Aktivitas di tab mana pun dihitung (semua tab berbagi localStorage).
export default function IdleLogout() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let lastWrite = 0;
    let loggingOut = false;

    const touch = () => {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {}
    };
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 5000) {
        lastWrite = now;
        touch();
      }
    };

    const check = async () => {
      if (loggingOut) return;
      let last = Date.now();
      try {
        last = Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
      } catch {}
      if (Date.now() - last >= IDLE_LIMIT_MS) {
        loggingOut = true;
        await supabase.auth.signOut();
        router.replace('/login?reason=idle');
        router.refresh();
      }
    };
    const onVisible = () => {
      if (!document.hidden) check();
    };

    touch();
    EVENTS.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const timer = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      EVENTS.forEach((e) => document.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
