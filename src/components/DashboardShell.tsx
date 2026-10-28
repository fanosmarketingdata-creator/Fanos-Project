'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import IdleLogout from '@/components/IdleLogout';
import { useLang } from '@/components/I18nProvider';
import { setLang, type Lang } from '@/lib/i18n/lang';
import FigmaCursor from '@/components/FigmaCursor';
import NumberInputFix from '@/components/NumberInputFix';
import PushPrompt from '@/components/PushPrompt';
import { NAV_GROUPS, ALL_MENU_KEYS, navLabel, flatItems, filterGroups, type NavItem } from '@/lib/menu';
import PresenceWidget from '@/components/PresenceWidget';
import ResponsiveTables from '@/components/ResponsiveTables';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  photo_url: string | null;
  cursor_color?: string;
};

const LOGO_URL = 'https://raw.githubusercontent.com/Fouralist/picture/refs/heads/main/LOGO.ico';

// Label menu bersumber Inggris; pada bahasa Indonesia diganti lewat kamus ini.
function useNavLabel() {
  const lang = useLang();
  return (l: string) => navLabel(lang, l);
}

function Flyout({ item, pathname }: { item: NavItem; pathname: string | null }) {
  const nl = useNavLabel();
  const [open, setOpen] = useState(false);
  const active = (item.children ?? []).some((c) => isActive(pathname, c.href));
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition ${
          active || open ? 'bg-brand-50 text-brand-500' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-500'
        }`}
      >
        <i className={`${item.icon} w-4 text-center text-[13px] leading-none`} />
        <span className="flex-1">{nl(item.label)}</span>
        <i className="fi fi-rr-angle-small-right text-[11px] leading-none" />
      </button>
      {open && (
        <div role="menu" className="absolute left-full top-0 z-[610] min-w-[200px] pl-1.5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_12px_36px_-8px_rgba(15,23,42,0.22)] ring-1 ring-brand-500/5">
            {(item.children ?? []).map((c) => {
              const a = isActive(pathname, c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  role="menuitem"
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                    a ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-500'
                  }`}
                >
                  <i className={`${c.icon} w-4 text-center text-[13px] leading-none`} />
                  <span>{nl(c.label)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string | null, href: string) {
  // '/dashboard' harus cocok persis, kalau tidak semua menu ikut aktif.
  if (href.startsWith('#')) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  if (!pathname?.startsWith(href)) return false;
  // Menu dengan alamat yang lebih spesifik menang (mis. /products/price-list vs /products).
  return !ALL_MENU_KEYS.some((k) => k.length > href.length && k.startsWith(href) && pathname.startsWith(k));
}

function UserMenu({ profile, onLogout }: { profile: { id?: string; full_name: string; role: string; photo_url?: string | null }; onLogout: () => void }) {
  const showPresence = profile.role !== 'Superuser' && !!profile.id;
  const lang = useLang();
  const nl = useNavLabel();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options: { code: Lang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'id', label: 'Bahasa Indonesia' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1.5 transition hover:bg-slate-100"
      >
        <span className="relative">
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 text-brand-500">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{profile.full_name?.charAt(0).toUpperCase()}</span>
            )}
          </span>
          {showPresence && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
        </span>
        <i className={`fi fi-rr-angle-small-down text-[10px] leading-none text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-[700] mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="border-b border-slate-100 px-2.5 pb-2 pt-1.5">
            <div className="text-[12px] font-bold text-slate-800">{profile.full_name}</div>
            <div className="text-[10px] text-slate-400">{profile.role}</div>
          </div>
          <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <i className="fi fi-rr-globe mr-1.5" />{nl('Language')}
          </div>
          {options.map((o) => (
            <button
              key={o.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang === o.code}
              data-no-i18n
              onClick={() => (lang === o.code ? setOpen(false) : setLang(o.code))}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition ${
                lang === o.code ? 'bg-brand-50 text-brand-500' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex-1">{o.label}</span>
              {lang === o.code && <i className="fi fi-rr-check text-[11px]" />}
            </button>
          ))}
          <div className="my-1.5 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-red-600 transition hover:bg-red-50"
          >
            <i className="fi fi-rr-sign-out-alt text-[13px] leading-none" />
            <span className="flex-1">{nl('Log out')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardShell({
  profile,
  allowedMenus = null,
  children,
}: {
  profile: Profile;
  allowedMenus?: string[] | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isSuperuser = profile.role === 'Superuser';
  const nl = useNavLabel();

  // Superuser hanya melihat grup Superuser; role lain tidak pernah melihatnya.
  const visibleGroups = filterGroups(
    NAV_GROUPS.filter((g) => (isSuperuser ? !!g.superuserOnly : !g.superuserOnly)),
    isSuperuser ? null : allowedMenus
  );

  const [openId, setOpenId] = useState<string | null>(null);
  // Layar < lg: menu jadi panel hamburger dengan akordeon (tidak ada hover di HP/tablet).
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [mobileSubs, setMobileSubs] = useState<string[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropdown terbuka saat di-hover. Penutupan ditunda sebentar supaya
  // kursor bisa berpindah dari tombol ke panel tanpa dropdown berkedip.
  // Hover hanya dipakai di perangkat yang punya pointer hover (mouse/trackpad).
  // Di layar sentuh (HP, iPad) mouseenter palsu bentrok dengan tap, jadi diabaikan.
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  function openMenu(id: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenId(id);
  }
  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenId(null), 120);
  }

  // Tutup dropdown setiap pindah halaman.
  useEffect(() => {
    setOpenId(null);
    setMobileOpen(false);
  }, [pathname]);

  // Tap di luar header menutup dropdown / panel mobile.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openId && !mobileOpen) return;
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenId(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [openId, mobileOpen]);

  // Buka grup yang sedang aktif saat panel mobile dibuka.
  useEffect(() => {
    if (!mobileOpen) return;
    const current = visibleGroups.find((g) => !g.direct && g.items.some((it) => isActive(pathname, it.href)));
    setMobileGroup(current?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen]);

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      // Overlay tetap tampil sampai halaman login terbuka.
      router.replace('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8fc] print:block print:bg-white">
      {loggingOut && (
        <div className="login-overlay print:hidden" role="status" aria-live="polite">
          <div className="spinner" />
          <p>Keluar...</p>
          <span className="sub-text">Mohon menunggu</span>
        </div>
      )}
      <NumberInputFix />
      <PushPrompt />
      <FigmaCursor name={profile.full_name || 'you'} colour={profile.cursor_color} />
      <IdleLogout />
      <ResponsiveTables />

      <header ref={headerRef} className="sticky top-0 z-[500] flex items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-[0_8px_24px_-20px_rgba(47,107,240,0.5)] backdrop-blur sm:gap-3 sm:px-4 print:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-brand-500/10 lg:hidden"
        >
          {/* SVG inline: tetap tampil walaupun CDN ikon gagal dimuat */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL} alt="Fanos" className="mr-1 h-[20px] w-auto shrink-0" />

        <nav className="hidden min-w-0 flex-1 flex-nowrap items-center gap-0.5 lg:flex">

          {visibleGroups.map((group) => {
            const groupActive = flatItems(group.items).some((it) => isActive(pathname, it.href));
            const btnClass = `group/nav inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors duration-150 xl:px-3 ${
              groupActive
                ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30'
                : openId === group.id
                  ? 'bg-slate-100 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
            }`;

            if (group.direct) {
              return (
                <Link key={group.id} href={group.items[0].href} className={btnClass}>
                  <i className={`${group.icon} hidden text-[12px] leading-none transition-transform duration-200 group-hover/nav:scale-110 xl:inline`} />
                  <span>{nl(group.label)}</span>
                </Link>
              );
            }

            const open = openId === group.id;
            return (
              <div
                key={group.id}
                className="relative shrink-0"
                onMouseEnter={() => canHover() && openMenu(group.id)}
                onMouseLeave={() => canHover() && scheduleClose()}
              >
                <button
                  type="button"
                  className={btnClass}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  // Layar sentuh: tap membuka/menutup. Mouse: sudah terbuka oleh hover.
                  onClick={() => (canHover() ? openMenu(group.id) : open ? setOpenId(null) : openMenu(group.id))}
                  onKeyDown={(e) => e.key === 'Escape' && setOpenId(null)}
                >
                  <i className={`${group.icon} hidden text-[12px] leading-none transition-transform duration-200 group-hover/nav:scale-110 xl:inline`} />
                  <span>{nl(group.label)}</span>
                  <i className={`fi fi-rr-angle-small-down hidden text-[10px] leading-none transition-transform xl:inline ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div
                    role="menu"
                    className="nav-pop absolute left-0 top-full z-[600] min-w-[200px] pt-2"
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                      {group.items.map((item) => {
                        if (item.children) return <Flyout key={item.href} item={item} pathname={pathname} />;
                        const active = isActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                              active
                                ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30'
                                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-500'
                            }`}
                          >
                            <i className={`${item.icon} w-4 text-center text-[13px] leading-none`} />
                            <span>{nl(item.label)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex-1 lg:hidden" />

        {!isSuperuser && (
          <div className="shrink-0">
            <PresenceWidget meId={profile.id} />
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2 border-l border-slate-200 pl-3">
          <UserMenu profile={profile} onLogout={handleLogout} />
        </div>

        {mobileOpen && (
          <div className="absolute inset-x-0 top-full max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-slate-200 bg-white p-2 shadow-lg lg:hidden">
            {visibleGroups.map((group) => {
              const groupActive = flatItems(group.items).some((it) => isActive(pathname, it.href));
              const rowClass = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-bold ${
                groupActive ? 'bg-brand-500/10 text-brand-900' : 'text-slate-600'
              }`;
              if (group.direct) {
                return (
                  <Link key={group.id} href={group.items[0].href} className={rowClass}>
                    <i className={`${group.icon} w-4 text-center text-[13px] leading-none`} />
                    <span>{nl(group.label)}</span>
                  </Link>
                );
              }
              const open = mobileGroup === group.id;
              return (
                <div key={group.id}>
                  <button type="button" className={rowClass} onClick={() => setMobileGroup(open ? null : group.id)}>
                    <i className={`${group.icon} w-4 text-center text-[13px] leading-none`} />
                    <span className="flex-1">{nl(group.label)}</span>
                    <i className={`fi fi-rr-angle-small-down text-[12px] leading-none transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="mb-1 ml-5 border-l border-slate-100 pl-2">
                      {group.items.map((item) => {
                        const linkCls = (href: string, pad: string) =>
                          `flex items-center gap-2.5 rounded-lg py-2 pr-3 text-[13px] font-medium ${pad} ${
                            isActive(pathname, href)
                              ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
                              : 'text-slate-600 active:bg-brand-50'
                          }`;
                        if (!item.children) {
                          return (
                            <Link key={item.href} href={item.href} className={linkCls(item.href, 'pl-3')}>
                              <i className={`${item.icon} w-4 text-center text-[13px] leading-none`} />
                              <span>{nl(item.label)}</span>
                            </Link>
                          );
                        }
                        const subOpen = mobileSubs.includes(item.href) || item.children.some((c) => isActive(pathname, c.href));
                        return (
                          <div key={item.href}>
                            <button
                              type="button"
                              aria-expanded={subOpen}
                              onClick={() => setMobileSubs((p) => (p.includes(item.href) ? p.filter((x) => x !== item.href) : [...p, item.href]))}
                              className="flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-3 text-left text-[13px] font-medium text-slate-600 active:bg-brand-50"
                            >
                              <i className={`${item.icon} w-4 text-center text-[13px] leading-none`} />
                              <span className="flex-1">{nl(item.label)}</span>
                              <i className={`fi fi-rr-angle-small-down text-[12px] leading-none transition-transform ${subOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {subOpen && (
                              <div className="ml-4 border-l border-slate-100 pl-1">
                                {item.children.map((c) => (
                                  <Link key={c.href} href={c.href} className={linkCls(c.href, 'pl-3')}>
                                    <i className={`${c.icon} w-4 text-center text-[13px] leading-none`} />
                                    <span>{nl(c.label)}</span>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </header>

      <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6 print:p-0">{children}</main>
    </div>
  );
}
