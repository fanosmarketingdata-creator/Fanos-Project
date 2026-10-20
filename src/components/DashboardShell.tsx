'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import IdleLogout from '@/components/IdleLogout';
import { useLang } from '@/components/I18nProvider';
import { setLang, type Lang } from '@/lib/i18n/lang';
import FigmaCursor from '@/components/FigmaCursor';
import PresenceWidget from '@/components/PresenceWidget';
import ResponsiveTables from '@/components/ResponsiveTables';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  photo_url: string | null;
  cursor_color?: string;
};

type NavItem = { href: string; label: string; icon: string; heading?: boolean; indent?: boolean; children?: NavItem[] };
// Grup dengan 1 item dan `direct: true` jadi tombol biasa (tanpa dropdown).
type NavGroup = { id: string; label: string; icon: string; items: NavItem[]; direct?: boolean; superuserOnly?: boolean };

// Struktur grup & ikon mengikuti index.html lama (Flaticon uicons).
const NAV_GROUPS: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'fi fi-rr-dashboard',
    direct: true,
    items: [{ href: '/dashboard', label: 'Overview', icon: 'fi fi-rr-apps' }],
  },
  {
    id: 'master',
    label: 'Master Data',
    icon: 'fi fi-rr-database',
    items: [
      { href: '/dashboard/clients', label: 'Clients', icon: 'fi fi-rr-users' },
      {
        href: '#project',
        label: 'Project',
        icon: 'fi fi-rr-briefcase',
        children: [
          { href: '/dashboard/projects', label: 'Project Master', icon: 'fa-solid fa-diagram-project' },
          { href: '/dashboard/project-classifications', label: 'Project Classification', icon: 'fi fi-rr-tags' },
        ],
      },
      { href: '/dashboard/vendors', label: 'Vendors', icon: 'fa-solid fa-truck' },
      { href: '/dashboard/products', label: 'Products', icon: 'fi fi-rr-boxes' },
    ],
  },
  {
    id: 'pm',
    label: 'Project Management',
    icon: 'fi fi-rr-document-signed',
    items: [
      { href: '/dashboard/project-rfq', label: 'Project RFQ', icon: 'fi fi-rr-envelope-open-text' },
      { href: '/dashboard/boq-project', label: 'Project BOQ', icon: 'fa-solid fa-layer-group' },
      { href: '/dashboard/lighting-specification', label: 'Lighting Specification', icon: 'fi fi-rr-bulb' },
    ],
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: 'fi fi-rr-shopping-bag',
    items: [
      { href: '/dashboard/purchase-orders', label: 'Purchase Order', icon: 'fa-solid fa-truck-loading' },
      { href: '/dashboard/purchase-delivery', label: 'Purchase Delivery', icon: 'fi fi-rr-truck-side' },
      { href: '/dashboard/purchase-invoice', label: 'Purchase Invoice', icon: 'fi fi-rr-receipt' },
      { href: '/dashboard/purchase-payment', label: 'Purchase Payment', icon: 'fi fi-rr-wallet' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'fi fi-rr-refresh',
    items: [
      { href: '/dashboard/quotations', label: 'Quotation', icon: 'fi fi-rr-file-invoice' },
      { href: '/dashboard/sales-orders', label: 'Sales Order', icon: 'fi fi-rr-shopping-cart' },
      { href: '/dashboard/delivery-orders', label: 'Delivery Order', icon: 'fi fi-rr-shipping-fast' },
      { href: '/dashboard/invoices', label: 'Invoices', icon: 'fi fi-rr-receipt' },
      { href: '/dashboard/payments', label: 'Customer Payment', icon: 'fi fi-rr-money-bill-wave' },
      { href: '/dashboard/returns', label: 'Sales Return', icon: 'fi fi-rr-undo' },
    ],
  },
  {
    id: 'stock',
    label: 'Stock / Inventory',
    icon: 'fi fi-rr-boxes',
    items: [
      { href: '/dashboard/current-stock', label: 'Current Stock', icon: 'fi fi-rr-boxes' },
      { href: '/dashboard/stock-adjustment', label: 'Stock Adjustment', icon: 'fi fi-rr-edit' },
      { href: '/dashboard/stock-transfer', label: 'Stock Transfer', icon: 'fi fi-rr-exchange' },
      { href: '/dashboard/stock-movement', label: 'Stock Movement', icon: 'fi fi-rr-arrows-repeat' },
      { href: '/dashboard/warehouse', label: 'Warehouse', icon: 'fi fi-rr-warehouse-alt' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: 'fi fi-rr-credit-card',
    items: [
      { href: '/dashboard/outstanding', label: 'Outstanding', icon: 'fi fi-rr-triangle-warning' },
      { href: '/dashboard/credit-notes', label: 'Credit Notes', icon: 'fi fi-rr-badge-percent' },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: 'fi fi-rr-bell',
    items: [{ href: '/dashboard/reminders', label: 'Reminders', icon: 'fi fi-rr-bell' }],
  },
  {
    id: 'superuser',
    label: 'Superuser',
    icon: 'fi fi-rr-shield-check',
    superuserOnly: true,
    items: [
      { href: '/dashboard/team-members', label: 'Master Team Member', icon: 'fi fi-rr-users-alt' },
      { href: '/dashboard/accounts', label: 'Master Akun', icon: 'fi fi-rr-user-lock' },
      { href: '/dashboard/roles', label: 'Role Group', icon: 'fi fi-rr-shield-check' },
    ],
  },
];

const LOGO_URL = 'https://raw.githubusercontent.com/Fouralist/picture/refs/heads/main/LOGO.ico';

const flatItems = (items: NavItem[]): NavItem[] => items.flatMap((i) => (i.children ? i.children : [i]));
// Untuk menu mobile: item bersub ditampilkan sebagai judul + sub item menjorok.
const expandItems = (items: NavItem[]): NavItem[] =>
  items.flatMap((i) => (i.children ? [{ ...i, children: undefined, heading: true }, ...i.children.map((c) => ({ ...c, indent: true }))] : [i]));

function Flyout({ item, pathname }: { item: NavItem; pathname: string | null }) {
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
        <span className="flex-1">{item.label}</span>
        <i className="fi fi-rr-angle-small-right text-[11px] leading-none" />
      </button>
      {open && (
        <div role="menu" className="absolute left-full top-0 z-[610] min-w-[200px] pl-1.5">
          <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            {(item.children ?? []).map((c) => {
              const a = isActive(pathname, c.href);
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  role="menuitem"
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                    a ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-500'
                  }`}
                >
                  <i className={`${c.icon} w-4 text-center text-[13px] leading-none`} />
                  <span>{c.label}</span>
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
  return href === '/dashboard' ? pathname === '/dashboard' : !!pathname?.startsWith(href);
}

function UserMenu({ profile }: { profile: { full_name: string; role: string; photo_url?: string | null } }) {
  const lang = useLang();
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
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 text-brand-500">
          {profile.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold">{profile.full_name?.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-[12px] font-bold text-slate-800">{profile.full_name}</span>
          <span className="block text-[9.5px] text-slate-400">{profile.role}</span>
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
            <i className="fi fi-rr-globe mr-1.5" />Language
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
        </div>
      )}
    </div>
  );
}

export default function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isSuperuser = profile.role === 'Superuser';

  // Superuser hanya melihat grup Superuser; role lain tidak pernah melihatnya.
  const visibleGroups = NAV_GROUPS.filter((g) => (isSuperuser ? !!g.superuserOnly : !g.superuserOnly));

  const [openId, setOpenId] = useState<string | null>(null);
  // Layar < lg: menu jadi panel hamburger dengan akordeon (tidak ada hover di HP/tablet).
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
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
    <div className="flex min-h-screen flex-col bg-[#f4f7fb] print:block print:bg-white">
      {loggingOut && (
        <div className="login-overlay print:hidden" role="status" aria-live="polite">
          <div className="spinner" />
          <p>Keluar...</p>
          <span className="sub-text">Mohon menunggu</span>
        </div>
      )}
      <FigmaCursor name={profile.full_name || 'you'} colour={profile.cursor_color} />
      <IdleLogout />
      <ResponsiveTables />

      <header ref={headerRef} className="sticky top-0 z-[500] flex items-center gap-2 border-b border-slate-200/70 bg-white/90 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4 print:hidden">
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
        <img src={LOGO_URL} alt="Fanos" className="h-6 w-auto shrink-0 drop-shadow-sm" />

        <nav className="hidden min-w-0 flex-1 flex-nowrap items-center gap-0.5 lg:flex">

          {visibleGroups.map((group) => {
            const groupActive = flatItems(group.items).some((it) => isActive(pathname, it.href));
            const btnClass = `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition ${
              groupActive || openId === group.id
                ? 'bg-brand-500/10 text-brand-900'
                : 'text-slate-500 hover:bg-brand-500/[0.07] hover:text-brand-500'
            }`;

            if (group.direct) {
              return (
                <Link key={group.id} href={group.items[0].href} className={btnClass}>
                  <i className={`${group.icon} text-[11px] leading-none`} />
                  <span>{group.label}</span>
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
                  <i className={`${group.icon} text-[11px] leading-none`} />
                  <span>{group.label}</span>
                  <i className={`fi fi-rr-angle-small-down text-[10px] leading-none transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-[600] min-w-[190px] pt-1.5"
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
                            <span>{item.label}</span>
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
          <div className="hidden sm:block">
            <PresenceWidget meId={profile.id} />
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2 border-l border-slate-300/70 pl-3">
          <UserMenu profile={profile} />
          <button
            onClick={handleLogout}
            title="Log out"
            className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600/10 text-xs text-red-600 transition hover:bg-red-600/20"
          >
            <i className="fi fi-rr-sign-out-alt" />
          </button>
        </div>

        {mobileOpen && (
          <div className="absolute inset-x-0 top-full max-h-[calc(100vh-3rem)] overflow-y-auto border-b border-slate-200 bg-white p-2 shadow-lg lg:hidden">
            <div className="mb-1 flex items-center gap-2 border-b border-slate-100 px-3 pb-2 pt-1 xl:hidden">
              <div className="text-[13px] font-bold text-slate-800">{profile.full_name}</div>
              <div className="text-[10px] text-slate-400">{profile.role}</div>
            </div>
            {visibleGroups.map((group) => {
              const groupActive = flatItems(group.items).some((it) => isActive(pathname, it.href));
              const rowClass = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-bold ${
                groupActive ? 'bg-brand-500/10 text-brand-900' : 'text-slate-600'
              }`;
              if (group.direct) {
                return (
                  <Link key={group.id} href={group.items[0].href} className={rowClass}>
                    <i className={`${group.icon} w-4 text-center text-[13px] leading-none`} />
                    <span>{group.label}</span>
                  </Link>
                );
              }
              const open = mobileGroup === group.id;
              return (
                <div key={group.id}>
                  <button type="button" className={rowClass} onClick={() => setMobileGroup(open ? null : group.id)}>
                    <i className={`${group.icon} w-4 text-center text-[13px] leading-none`} />
                    <span className="flex-1">{group.label}</span>
                    <i className={`fi fi-rr-angle-small-down text-[12px] leading-none transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="mb-1 ml-5 border-l border-slate-100 pl-2">
                      {expandItems(group.items).map((item) => item.heading ? (
                        <div key={item.href} className="flex items-center gap-2.5 px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          <i className={`${item.icon} w-4 text-center text-[12px] leading-none`} />
                          <span>{item.label}</span>
                        </div>
                      ) : (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2.5 rounded-lg py-2 pr-3 text-[13px] font-medium ${item.indent ? 'pl-7' : 'pl-3'} ${
                            isActive(pathname, item.href)
                              ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
                              : 'text-slate-600 active:bg-brand-50'
                          }`}
                        >
                          <i className={`${item.icon} w-4 text-center text-[13px] leading-none`} />
                          <span>{item.label}</span>
                        </Link>
                      ))}
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
