'use client';

import { useEffect, useState } from 'react';

export const THEME_KEY = 'fanos-theme';

// Tombol terang/gelap. Pilihan disimpan di browser (localStorage) dan TIDAK dihapus saat logout,
// jadi tema tetap sama sampai user mengubahnya lagi. Bawaan: terang.
export default function ThemeToggle({ className = '', variant = 'icon' }: { className?: string; variant?: 'icon' | 'menu' }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* mode privat: tema tetap berganti untuk sesi ini */
    }
  };

  if (variant === 'menu') {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={toggle}
        className={`mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 ${className}`}
      >
        <i className={`${dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} w-[13px] text-center text-[12px] leading-none`} />
        <span className="flex-1">{dark ? 'Mode Terang' : 'Mode Gelap'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Mode terang' : 'Mode gelap'}
      title={dark ? 'Mode terang' : 'Mode gelap'}
      data-no-i18n
      className={`theme-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[13px] text-slate-600 transition hover:border-brand-500 hover:text-brand-500 ${className}`}
    >
      <i className={dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} />
    </button>
  );
}
