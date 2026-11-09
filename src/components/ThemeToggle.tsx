'use client';

import { useEffect, useState } from 'react';

export const THEME_KEY = 'fanos-theme';

// Tombol terang/gelap. Pilihan disimpan di browser (localStorage) dan TIDAK dihapus saat logout,
// jadi tema tetap sama sampai user mengubahnya lagi. Bawaan: terang.
export default function ThemeToggle({ className = '' }: { className?: string }) {
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
