'use client';

import { useEffect, useRef, useState } from 'react';

export const THEME_KEY = 'fanos-theme';

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };

// Tombol terang/gelap mengambang di kiri bawah (semua halaman, termasuk login).
// Pilihan disimpan di browser (localStorage) dan TIDAK dihapus saat logout. Bawaan: terang.
// variant 'fab' = tombol mengambang kiri bawah (halaman login); 'menu' = baris di menu profil.
export default function ThemeToggle({ variant = 'fab' }: { variant?: 'fab' | 'menu' }) {
  const [dark, setDark] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const apply = (next: boolean) => {
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* mode privat: tema tetap berganti untuk sesi ini */
    }
  };

  const toggle = () => {
    const next = !dark;
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as VTDocument;

    if (!reduce && doc.startViewTransition) {
      // Animasi lingkaran yang meluas dari tombol (View Transitions API)
      const r = btn.current?.getBoundingClientRect();
      const x = r ? r.left + r.width / 2 : 24;
      const y = r ? r.top + r.height / 2 : window.innerHeight - 24;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add('theme-vt');
      const t = doc.startViewTransition(() => apply(next));
      t.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
          );
        })
        .catch(() => {});
      t.finished.finally(() => root.classList.remove('theme-vt'));
      return;
    }

    // Cadangan: transisi warna halus
    root.classList.add('theme-fade');
    apply(next);
    window.setTimeout(() => root.classList.remove('theme-fade'), 450);
  };

  if (variant === 'menu') {
    return (
      <button
        ref={btn}
        type="button"
        role="menuitem"
        onClick={toggle}
        className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
      >
        <i className={`${dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} w-[13px] text-center text-[12px] leading-none`} />
        <span className="flex-1">{dark ? 'Mode Terang' : 'Mode Gelap'}</span>
      </button>
    );
  }

  return (
    <button
      ref={btn}
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Mode terang' : 'Mode gelap'}
      title={dark ? 'Mode terang' : 'Mode gelap'}
      data-no-i18n
      className="theme-toggle fixed bottom-4 left-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[15px] text-slate-600 shadow-lg transition hover:scale-105 hover:border-brand-500 hover:text-brand-500 print:hidden"
    >
      <i className={dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} />
    </button>
  );
}
