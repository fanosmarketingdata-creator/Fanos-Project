'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/components/I18nProvider';
import { savePushSubscription } from '@/lib/push-actions';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const ASKED_KEY = 'fanos_push_asked_at';
const REASK_MS = 24 * 60 * 60 * 1000; // bila "Nanti saja", tanya lagi setelah 1 hari

const L = {
  id: { title: 'Aktifkan Notifikasi', body: 'Dapatkan pemberitahuan di PC Anda setiap ada pengumuman sistem baru, walaupun browser tidak sedang dibuka.', allow: 'Aktifkan', later: 'Nanti saja', blocked: 'Notifikasi diblokir di browser. Izinkan lewat ikon gembok di address bar.' },
  en: { title: 'Enable Notifications', body: 'Get notified on your PC whenever there is a new system announcement, even when the browser is not open.', allow: 'Enable', later: 'Not now', blocked: 'Notifications are blocked in the browser. Allow them via the lock icon in the address bar.' },
};

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
const toB64 = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...Array.from(new Uint8Array(buf)))) : '');

async function subscribe() {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) });
  const json = sub.toJSON();
  await savePushSubscription({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh || toB64(sub.getKey('p256dh')),
    auth: json.keys?.auth || toB64(sub.getKey('auth')),
    userAgent: navigator.userAgent,
  });
}

// Meminta izin notifikasi saat pertama kali membuka aplikasi, lalu mendaftarkan browser untuk Web Push.
export default function PushPrompt() {
  const lang = useLang();
  const t = L[lang === 'en' ? 'en' : 'id'];
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!VAPID || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      subscribe().catch(() => {}); // jaga langganan tetap terdaftar
      return;
    }
    if (Notification.permission === 'denied') return;
    let last = 0;
    try { last = Number(localStorage.getItem(ASKED_KEY) || 0); } catch {}
    if (!last || Date.now() - last > REASK_MS) setOpen(true);
  }, []);

  function later() {
    try { localStorage.setItem(ASKED_KEY, String(Date.now())); } catch {}
    setOpen(false);
  }

  async function allow() {
    try { localStorage.setItem(ASKED_KEY, String(Date.now())); } catch {}
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setOpen(false);
      subscribe().catch(() => {});
    } else if (perm === 'denied') {
      setBlocked(true);
    } else {
      setOpen(false);
    }
  }

  if (!open) return null;
  return (
    <div data-no-i18n className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4 print:hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500">
          <i className="fi fi-rr-bell text-2xl leading-none" />
        </div>
        <div className="text-lg font-bold text-slate-800">{t.title}</div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{t.body}</p>
        {blocked && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[12px] text-amber-700">{t.blocked}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={later} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">{t.later}</button>
          {!blocked && <button type="button" onClick={allow} className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">{t.allow}</button>}
        </div>
      </div>
    </div>
  );
}
