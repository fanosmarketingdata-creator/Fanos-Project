'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS, navLabel, flatItems } from '@/lib/menu';
import { useLang } from '@/components/I18nProvider';
import { translateTextId } from '@/lib/i18n/dict';

const APP = 'Fouralist';
const ITEMS = NAV_GROUPS.flatMap((g) => flatItems(g.items)).filter((i) => i.href.startsWith('/') && i.href !== '/dashboard');
const EXTRA_ID: Record<string, string> = { Login: 'Masuk', Maintenance: 'Pemeliharaan' };

// Judul tab browser: "<Nama Halaman> | Fouralist", mengikuti bahasa (EN/ID) dan halaman yang dituju.
export function pageTitleFor(pathname: string, lang: 'en' | 'id'): string {
  let name = '';
  if (pathname === '/login' || pathname === '/') name = 'Login';
  else if (pathname.startsWith('/maintenance')) name = 'Maintenance';
  else if (pathname === '/dashboard') name = 'Dashboard';
  else {
    const m = ITEMS.filter((i) => pathname === i.href || pathname.startsWith(i.href + '/')).sort((a, b) => b.href.length - a.href.length)[0];
    name = m?.label ?? '';
  }
  if (!name) return APP;
  const shown = lang === 'id' ? EXTRA_ID[name] ?? (navLabel('id', name) !== name ? navLabel('id', name) : translateTextId(name)) : name;
  return `${shown} | ${APP}`;
}

export default function PageTitle() {
  const pathname = usePathname() ?? '';
  const lang = useLang();
  useEffect(() => {
    const title = pageTitleFor(pathname, lang);
    const apply = () => { if (document.title !== title) document.title = title; };
    apply();
    // Next.js bisa menimpa <title> saat navigasi; pertahankan judul kita.
    const el = document.querySelector('title');
    const obs = new MutationObserver(apply);
    if (el) obs.observe(el, { childList: true, characterData: true, subtree: true });
    return () => obs.disconnect();
  }, [pathname, lang]);
  return null;
}
