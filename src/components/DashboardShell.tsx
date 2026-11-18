'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import IdleLogout from '@/components/IdleLogout';
import { useLang } from '@/components/I18nProvider';
import { setLang, type Lang } from '@/lib/i18n/lang';
import FigmaCursor from '@/components/FigmaCursor';
import NumberInputFix from '@/components/NumberInputFix';
import PushPrompt from '@/components/PushPrompt';
import { NAV_GROUPS, ALL_MENU_KEYS, navLabel, flatItems, filterGroups, type NavItem } from '@/lib/menu';
import ThemeToggle from '@/components/ThemeToggle';
import PresenceWidget from '@/components/PresenceWidget';
import MaintenanceNotice from '@/components/MaintenanceNotice';
import AuditBell from '@/components/AuditBell';
import ResponsiveTables from '@/components/ResponsiveTables';
import ProfileModal, { type MyProfile } from '@/components/ProfileModal';
import { NAV_POS_KEY, NAV_POS_OPTIONS, isNavPos, cornerPopClass, groupPopClass, flyoutPopClass, type NavPos } from '@/lib/nav-pos';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  photo_url: string | null;
  cursor_color?: string;
  phone?: string | null;
  email?: string | null;
};

const LOGO_URL = 'https://raw.githubusercontent.com/Fouralist/picture/refs/heads/main/LOGO.ico';

// Label menu bersumber Inggris; pada bahasa Indonesia diganti lewat kamus ini.
function useNavLabel() {
  const lang = useLang();
  return (l: string) => navLabel(lang, l);
}

// Menjaga popup tetap di dalam layar (mis. grup di dekat dasar sidebar) dengan menggeser lewat properti `translate`.
function useClamp<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    el.style.translate = '';
    const r = el.getBoundingClientRect();
    let dy = 0, dx = 0;
    if (r.bottom > window.innerHeight - 8) dy = window.innerHeight - 8 - r.bottom;
    if (r.top + dy < 8) dy = 8 - r.top;
    if (r.right > window.innerWidth - 8) dx = window.innerWidth - 8 - r.right;
    if (r.left + dx < 8) dx = 8 - r.left;
    if (dx || dy) el.style.translate = `${dx}px ${dy}px`;
  }, [open]);
  return ref;
}

function Flyout({ item, pathname, pos }: { item: NavItem; pathname: string | null; pos: NavPos }) {
  const nl = useNavLabel();
  const [open, setOpen] = useState(false);
  const popRef = useClamp<HTMLDivElement>(open);
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
        <i className={`fi ${pos === 'right' ? 'fi-rr-angle-small-left' : 'fi-rr-angle-small-right'} text-[11px] leading-none`} />
      </button>
      {open && (
        <div ref={popRef} role="menu" className={`absolute ${flyoutPopClass(pos)} z-[610] min-w-[200px]`}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_12px_36px_-8px_rgba(15,23,42,0.22)] ring-1 ring-brand-500/5">
            {(item.children ?? []).map((c) => {
              const a = isActive(pathname, c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  role="menuitem"
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                    a ? "relative font-semibold text-brand-600 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-500 before:content-['']" : 'text-slate-600 hover:bg-brand-50 hover:text-brand-500'
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

function GroupPop({ pos, children }: { pos: NavPos; children: React.ReactNode }) {
  const ref = useClamp<HTMLDivElement>(true);
  return (
    <div ref={ref} role="menu" className={`nav-pop absolute ${groupPopClass(pos)} z-[600] min-w-[200px]`} data-pos={pos}>
      {children}
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

function UserMenu({ profile, onLogout, navPos, onNavPos }: { profile: { id?: string; full_name: string; role: string; photo_url?: string | null; phone?: string | null; email?: string | null }; onLogout: () => void; navPos: NavPos; onNavPos: (p: NavPos) => void }) {
  const showPresence = profile.role !== 'Superuser' && !!profile.id;
  const lang = useLang();
  const nl = useNavLabel();
  const [open, setOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useClamp<HTMLDivElement>(open);

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
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 ring-1 ring-slate-300 text-brand-500">
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
        <div ref={popRef} role="menu" className={`absolute ${cornerPopClass(navPos)} z-[700] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]`}>
          <div className="border-b border-slate-100 px-2.5 pb-2 pt-1.5">
            <div className="text-[12px] font-bold text-slate-800">{profile.full_name}</div>
            <div className="text-[10px] text-slate-400">{profile.role}</div>
          </div>
          {profile.id && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); setEditProfile(true); }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <i className="fi fi-rr-user text-[13px] leading-none" />
              <span className="flex-1">{nl('Edit Profile')}</span>
            </button>
          )}
          <ThemeToggle variant="menu" />
          <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <i className="fi fi-rr-apps mr-1.5" />{nl('Menu Position')}
          </div>
          <div className="grid grid-cols-4 gap-1 px-1 pb-1" role="radiogroup" aria-label="Menu Position">
            {NAV_POS_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={navPos === o.id}
                title={nl(o.label)}
                onClick={() => onNavPos(o.id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition ${
                  navPos === o.id ? 'bg-brand-50 text-brand-500' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <i className={`${o.icon} text-[14px] leading-none`} />
                <span>{nl(o.label)}</span>
              </button>
            ))}
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
      {editProfile && profile.id && <ProfileModal profile={profile as MyProfile} onClose={() => setEditProfile(false)} />}
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
    // Superuser: menu Superuser + halaman utama (Dashboard); role lain tidak pernah melihat grup Superuser.
    NAV_GROUPS.filter((g) => (isSuperuser ? !!g.superuserOnly || g.id === 'dashboard' : !g.superuserOnly)),
    isSuperuser ? null : allowedMenus
  );

  // Posisi bar menu: dipilih di menu profil, disimpan per browser. Layar < lg selalu memakai bar atas.
  const [navPos, setNavPosState] = useState<NavPos>('top');
  useEffect(() => {
    try { const v = localStorage.getItem(NAV_POS_KEY); if (isNavPos(v)) setNavPosState(v); } catch {}
  }, []);
  const setNavPos = (p: NavPos) => {
    setNavPosState(p);
    setOpenId(null);
    try { localStorage.setItem(NAV_POS_KEY, p); } catch {}
  };
  const vertical = navPos === 'left' || navPos === 'right';

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
  // Tinggi header dibagikan sebagai --hdr-h supaya halaman daftar bisa mengisi sisa layar persis (pagination menempel di bawah).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const root = document.documentElement;
    const set = () => {
      const lg = window.matchMedia('(min-width: 1024px)').matches;
      // Sidebar (kiri/kanan) tidak memakan tinggi layar; bar bawah menggeser island notifikasi ke atas bar.
      root.style.setProperty('--hdr-h', `${lg && vertical ? 0 : el.offsetHeight}px`);
      root.style.setProperty('--dock-b', `${lg && navPos === 'bottom' ? el.offsetHeight : 0}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    window.addEventListener('resize', set);
    return () => { ro.disconnect(); window.removeEventListener('resize', set); document.documentElement.style.setProperty('--dock-b', '0px'); };
  }, [vertical, navPos]);
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
    <div className={`flex min-h-screen flex-col bg-[#f6f8fc] print:block print:bg-white ${navPos === 'left' ? 'lg:flex-row' : navPos === 'right' ? 'lg:flex-row-reverse' : ''}`}>
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
      <MaintenanceNotice isSuperuser={profile.role === 'Superuser'} />
      <ResponsiveTables />

      <header
        ref={headerRef}
        data-nav-pos={navPos}
        className={`sticky top-0 z-[500] flex items-center gap-2 border-b border-slate-200/80 bg-white/90 px-3 py-2.5 shadow-[0_8px_24px_-20px_rgba(47,107,240,0.5)] backdrop-blur sm:gap-3 sm:px-4 print:hidden ${
          navPos === 'bottom'
            ? 'lg:top-auto lg:bottom-0 lg:order-last lg:border-b-0 lg:border-t lg:shadow-[0_-8px_24px_-20px_rgba(47,107,240,0.5)]'
            : vertical
              ? `lg:h-screen lg:w-[216px] lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-3 lg:border-b-0 lg:px-3 lg:py-4 ${navPos === 'left' ? 'lg:border-r' : 'lg:border-l'}`
              : ''
        }`}
      >
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
        <img src={LOGO_URL} alt="Fanos" className={`logo-light mr-1 h-[20px] w-auto shrink-0 ${vertical ? 'lg:mr-0 lg:self-start lg:px-1' : ''}`} />
        <img src="/logo-fanos-dark.png" alt="Fanos" className={`logo-dark mr-1 h-[20px] w-auto shrink-0 ${vertical ? 'lg:mr-0 lg:self-start lg:px-1' : ''}`} />

        <nav className={`hidden min-w-0 flex-1 flex-nowrap items-center gap-0.5 lg:flex ${vertical ? 'lg:flex-col lg:items-stretch lg:gap-1' : 'lg:justify-center'}`}>

          {visibleGroups.map((group) => {
            const groupActive = flatItems(group.items).some((it) => isActive(pathname, it.href));
            const btnClass = `group/nav inline-flex shrink-0 items-center gap-1.5 lg:gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-colors duration-150 xl:px-3 ${vertical ? 'lg:w-full lg:px-3 lg:py-2' : ''} ${
              groupActive
                ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30'
                : openId === group.id
                  ? 'bg-slate-100 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
            }`;

            if (group.direct) {
              return (
                <Link key={group.id} href={group.items[0].href} className={btnClass}>
                  <i className={`${group.icon} hidden text-[12px] leading-none transition-transform duration-200 group-hover/nav:scale-110 lg:inline`} />
                  <span>{nl(group.label)}</span>
                </Link>
              );
            }

            const open = openId === group.id;
            return (
              <div
                key={group.id}
                className={`relative shrink-0 ${vertical ? 'lg:w-full' : ''}`}
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
                  <i className={`${group.icon} hidden text-[12px] leading-none transition-transform duration-200 group-hover/nav:scale-110 lg:inline`} />
                  <span className={vertical ? 'flex-1 text-left' : ''}>{nl(group.label)}</span>
                  {vertical ? (
                    <i className={`fi ${navPos === 'right' ? 'fi-rr-angle-small-left' : 'fi-rr-angle-small-right'} hidden text-[11px] leading-none lg:inline`} />
                  ) : (
                    <i className={`fi ${navPos === 'bottom' ? 'fi-rr-angle-small-up' : 'fi-rr-angle-small-down'} hidden text-[10px] leading-none transition-transform xl:inline ${open ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {open && (
                  <GroupPop pos={navPos}>
                    <div className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-xl">
                      {group.items.map((item) => {
                        if (item.children) return <Flyout key={item.href} item={item} pathname={pathname} pos={navPos} />;
                        const active = isActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                              active
                                ? "relative font-semibold text-brand-600 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-500 before:content-['']"
                                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-500'
                            }`}
                          >
                            <i className={`${item.icon} w-4 text-center text-[13px] leading-none`} />
                            <span>{nl(item.label)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </GroupPop>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex-1 lg:hidden" />

        {!isSuperuser && (
          <div className={`shrink-0 ${vertical ? 'lg:self-stretch' : ''}`}>
            <PresenceWidget meId={profile.id} />
          </div>
        )}

        <div className={`flex shrink-0 items-center gap-2 border-l border-slate-200 pl-3 ${vertical ? 'lg:justify-between lg:border-l-0 lg:border-t lg:pl-0 lg:pt-3' : ''}`}>
          <AuditBell meId={profile.id} isSuperuser={isSuperuser} popClass={cornerPopClass(navPos)} />
          <UserMenu profile={profile} onLogout={handleLogout} navPos={navPos} onNavPos={setNavPos} />
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
                              ? "relative font-semibold text-brand-600 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand-500 before:content-['']"
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
