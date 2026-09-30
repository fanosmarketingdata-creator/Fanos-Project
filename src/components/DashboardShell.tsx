'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  photo_url: string | null;
};

type NavItem = { href: string; label: string; icon: string };
type NavGroup = { label: string; items: NavItem[]; superuserOnly?: boolean };

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Master',
    items: [
      { href: '/dashboard/clients', label: 'Clients', icon: '👥' },
      { href: '/dashboard/vendors', label: 'Vendors', icon: '🚚' },
      { href: '/dashboard/products', label: 'Products', icon: '📦' },
    ],
  },
  {
    label: 'Proyek & Dokumen',
    items: [
      { href: '/dashboard/boq-project', label: 'BOQ Project', icon: '🗂️' },
      { href: '/dashboard/boq-akumulasi', label: 'BOQ Akumulasi', icon: '📋' },
      { href: '/dashboard/purchase-orders', label: 'Purchase Order', icon: '🧾' },
      { href: '/dashboard/quotations', label: 'Quotations', icon: '📄' },
      { href: '/dashboard/sales-orders', label: 'Sales Orders', icon: '🛒' },
      { href: '/dashboard/delivery-orders', label: 'Delivery Orders', icon: '🚛' },
      { href: '/dashboard/invoices', label: 'Invoices', icon: '🧮' },
      { href: '/dashboard/returns', label: 'Retur Penjualan', icon: '↩️' },
      { href: '/dashboard/payments', label: 'Payments', icon: '💳' },
      { href: '/dashboard/outstanding', label: 'Outstanding', icon: '⚠️' },
      { href: '/dashboard/credit-notes', label: 'Credit Notes', icon: '🧾' },
    ],
  },
  {
    label: 'Produktivitas',
    items: [
      { href: '/dashboard/defects', label: 'Defect List', icon: '🛠️' },
      { href: '/dashboard/reminders', label: 'Reminders', icon: '🔔' },
    ],
  },
  {
    label: 'Superuser',
    superuserOnly: true,
    items: [
      { href: '/dashboard/team-members', label: 'Master Team Member', icon: '👤' },
      { href: '/dashboard/accounts', label: 'Master Akun', icon: '🔐' },
      { href: '/dashboard/roles', label: 'Role Group', icon: '🛡️' },
    ],
  },
];

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

  const visibleGroups = NAV_GROUPS.filter((g) => (g.superuserOnly ? isSuperuser : true));

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-5">
          <span className="text-lg font-extrabold tracking-tight text-brand-900">FANÓS</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3.5">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-600">
              {profile.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold">{profile.full_name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[12.5px] font-semibold text-slate-800">{profile.full_name}</div>
              <div className="text-[10px] text-slate-400">{profile.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
            >
              ⏻
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}
