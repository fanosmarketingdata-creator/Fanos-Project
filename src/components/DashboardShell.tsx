'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import IdleLogout from '@/components/IdleLogout';
import PresenceWidget from '@/components/PresenceWidget';
import ResponsiveTables from '@/components/ResponsiveTables';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  photo_url: string | null;
};

type NavItem = { href: string; label: string; icon: string };
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
      { href: '/dashboard/vendors', label: 'Vendors', icon: 'fa-solid fa-truck' },
      { href: '/dashboard/products', label: 'Products', icon: 'fi fi-rr-boxes' },
      { href: '/dashboard/projects', label: 'Projects', icon: 'fi fi-rr-briefcase' },
    ],
  },
  {
    id: 'boq',
    label: 'BOQ',
    icon: 'fi fi-rr-document-signed',
    items: [
      { href: '/dashboard/boq-project', label: 'BOQ Project', icon: 'fa-solid fa-layer-group' },
      { href: '/dashboard/boq-akumulasi', label: 'BOQ Akumulasi', icon: 'fi fi-rr-calculator' },
    ],
  },
  {
    id: 'sales',
    label: 'Project Pipeline',
    icon: 'fi fi-rr-refresh',
    items: [
      { href: '/dashboard/purchase-orders', label: 'Purchase Order', icon: 'fa-solid fa-truck-loading' },
      { href: '/dashboard/quotations', label: 'Quotations', icon: 'fi fi-rr-file-invoice' },
      { href: '/dashboard/sales-orders', label: 'Sales Orders', icon: 'fi fi-rr-shopping-cart' },
      { href: '/dashboard/delivery-orders', label: 'Delivery Orders', icon: 'fi fi-rr-shipping-fast' },
      { href: '/dashboard/invoices', label: 'Invoices', icon: 'fi fi-rr-receipt' },
      { href: '/dashboard/returns', label: 'Retur Penjualan', icon: 'fi fi-rr-undo' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: 'fi fi-rr-credit-card',
    items: [
      { href: '/dashboard/payments', label: 'Payments', icon: 'fi fi-rr-money-bill-wave' },
      { href: '/dashboard/outstanding', label: 'Outstanding', icon: 'fi fi-rr-triangle-warning' },
      { href: '/dashboard/credit-notes', label: 'Credit Notes', icon: 'fi fi-rr-badge-percent' },
    ],
  },
  {
    id: 'field',
    label: 'Field Operations',
    icon: 'fi fi-rr-clipboard-list-check',
    items: [{ href: '/dashboard/defects', label: 'Defect List', icon: 'fi fi-rr-clipboard-list-check' }],
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

function isActive(pathname: string | null, href: string) {
  // '/dashboard' harus cocok persis, kalau tidak semua menu ikut aktif.
  return href === '/dashboard' ? pathname === '/dashboard' : !!pathname?.startsWith(href);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7fb] print:block print:bg-white">
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
            const groupActive = group.items.some((it) => isActive(pathname, it.href));
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
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 text-brand-500">
            {profile.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold">{profile.full_name?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="hidden leading-tight xl:block">
            <div className="text-[12px] font-bold text-slate-800">{profile.full_name}</div>
            <div className="text-[9.5px] text-slate-400">{profile.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
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
              const groupActive = group.items.some((it) => isActive(pathname, it.href));
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
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium ${
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
