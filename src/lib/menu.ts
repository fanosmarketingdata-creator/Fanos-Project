// Struktur menu bersama: dipakai navigasi, pemeriksaan hak akses, dan editor Role Group.
export type NavItem = { href: string; label: string; icon: string; heading?: boolean; indent?: boolean; children?: NavItem[] };
// Grup dengan 1 item dan `direct: true` jadi tombol biasa (tanpa dropdown).
export type NavGroup = { id: string; label: string; icon: string; items: NavItem[]; direct?: boolean; superuserOnly?: boolean };

// Struktur grup & ikon mengikuti index.html lama (Flaticon uicons).
export const NAV_GROUPS: NavGroup[] = [
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
      {
        href: '#finance',
        label: 'Finance',
        icon: 'fi fi-rr-credit-card',
        children: [
          { href: '/dashboard/discounts', label: 'Discount', icon: 'fi fi-rr-percentage' },
          { href: '/dashboard/cashbacks', label: 'Cashback', icon: 'fi fi-rr-coins' },
          { href: '/dashboard/payment-methods', label: 'Payment Method', icon: 'fi fi-rr-credit-card' },
          { href: '/dashboard/payment-terms', label: 'Payment Term', icon: 'fi fi-rr-calendar-clock' },
          { href: '/dashboard/taxes', label: 'Tax', icon: 'fi fi-rr-calculator' },
          { href: '/dashboard/credit-limits', label: 'Credit Limit', icon: 'fi fi-rr-hand-holding-usd' },
        ],
      },
      { href: '/dashboard/vendors', label: 'Vendors', icon: 'fa-solid fa-truck' },
      {
        href: '#products',
        label: 'Products',
        icon: 'fi fi-rr-boxes',
        children: [
          { href: '/dashboard/products', label: 'Catalogue', icon: 'fi fi-rr-book-alt' },
          { href: '/dashboard/products/price-list', label: 'Price List', icon: 'fi fi-rr-usd-circle' },
          { href: '/dashboard/brands', label: 'Brand', icon: 'fi fi-rr-award' },
        ],
      },
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
      { href: '/dashboard/purchase-delivery', label: 'Purchase Delivery', icon: 'fa-solid fa-dolly' },
      { href: '/dashboard/purchase-invoice', label: 'Purchase Invoice', icon: 'fi fi-rr-file-invoice-dollar' },
      { href: '/dashboard/purchase-payment', label: 'Purchase Payment', icon: 'fi fi-rr-wallet' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'fi fi-rr-chart-histogram',
    items: [
      { href: '/dashboard/quotations', label: 'Quotation', icon: 'fi fi-rr-file-invoice' },
      { href: '/dashboard/sales-orders', label: 'Sales Order', icon: 'fi fi-rr-shopping-cart' },
      { href: '/dashboard/delivery-orders', label: 'Delivery Order', icon: 'fi fi-rr-shipping-fast' },
      { href: '/dashboard/invoices', label: 'Invoices', icon: 'fi fi-rr-receipt' },
      {
        href: '#collection',
        label: 'Collection',
        icon: 'fi fi-rr-hand-holding-usd',
        children: [
          { href: '/dashboard/payments', label: 'Payment', icon: 'fi fi-rr-money-bill-wave' },
          { href: '/dashboard/outstanding', label: 'Outstanding', icon: 'fi fi-rr-triangle-warning' },
        ],
      },
      {
        href: '#return',
        label: 'Return',
        icon: 'fi fi-rr-undo',
        children: [
          { href: '/dashboard/returns/order', label: 'Order', icon: 'fi fi-rr-box-open' },
          { href: '/dashboard/returns/invoice', label: 'Invoice', icon: 'fi fi-rr-receipt' },
          { href: '/dashboard/credit-notes', label: 'Credit Note', icon: 'fi fi-rr-badge-percent' },
        ],
      },
    ],
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: 'fa-solid fa-boxes-stacked',
    items: [
      { href: '/dashboard/current-stock', label: 'Current Stock', icon: 'fa-solid fa-cubes' },
      { href: '/dashboard/stock-adjustment', label: 'Stock Adjustment', icon: 'fi fi-rr-edit' },
      { href: '/dashboard/stock-transfer', label: 'Stock Transfer', icon: 'fi fi-rr-exchange' },
      { href: '/dashboard/stock-movement', label: 'Stock Movement', icon: 'fi fi-rr-arrows-repeat' },
      { href: '/dashboard/warehouse', label: 'Warehouse', icon: 'fi fi-rr-warehouse-alt' },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: 'fi fi-rr-bell',
    items: [{ href: '/dashboard/reminders', label: 'Reminders', icon: 'fi fi-rr-alarm-clock' }],
  },
  {
    id: 'superuser',
    label: 'Superuser',
    icon: 'fa-solid fa-user-shield',
    superuserOnly: true,
    items: [
      { href: '/dashboard/team-members', label: 'Master Team Member', icon: 'fi fi-rr-id-badge' },
      { href: '/dashboard/accounts', label: 'Master Akun', icon: 'fi fi-rr-user-lock' },
      { href: '/dashboard/roles', label: 'Role Group', icon: 'fi fi-rr-shield-check' },
    ],
  },
];


export const NAV_ID: Record<string, string> = {
  Dashboard: 'Dasbor', Overview: 'Ringkasan', 'Master Data': 'Data Master', Clients: 'Klien', Project: 'Proyek',
  'Project Master': 'Master Proyek', 'Project Classification': 'Klasifikasi Proyek', Vendors: 'Vendor', Products: 'Produk', Catalogue: 'Katalog', 'Price List': 'Daftar Harga', Brand: 'Merek',
  'Project Management': 'Manajemen Proyek', 'Project RFQ': 'RFQ Proyek', 'Project BOQ': 'BOQ Proyek',
  'Lighting Specification': 'Spesifikasi Pencahayaan', Purchase: 'Pembelian', 'Purchase Order': 'Pesanan Pembelian',
  'Purchase Delivery': 'Pengiriman Pembelian', 'Purchase Invoice': 'Faktur Pembelian', 'Purchase Payment': 'Pembayaran Pembelian',
  Sales: 'Penjualan', Quotation: 'Penawaran', 'Sales Order': 'Pesanan Penjualan', 'Delivery Order': 'Surat Jalan',
  Invoices: 'Faktur', Collection: 'Penagihan', Payment: 'Pembayaran', Return: 'Retur', Order: 'Pesanan', Invoice: 'Faktur', 'Credit Note': 'Nota Kredit',
  Stock: 'Stok', 'Current Stock': 'Stok Saat Ini', 'Stock Adjustment': 'Penyesuaian Stok',
  'Stock Transfer': 'Transfer Stok', 'Stock Movement': 'Pergerakan Stok', Warehouse: 'Gudang', Finance: 'Keuangan', Cashback: 'Cashback', Discount: 'Diskon', 'Payment Method': 'Metode Pembayaran', 'Payment Term': 'Termin Pembayaran', Tax: 'Pajak', 'Credit Limit': 'Batas Kredit',
  Outstanding: 'Piutang', 'Credit Notes': 'Nota Kredit', Productivity: 'Produktivitas', Reminders: 'Pengingat',
  'Master Team Member': 'Master Anggota Tim', 'Master Akun': 'Master Akun', 'Role Group': 'Grup Peran',
  Language: 'Bahasa', 'Log out': 'Keluar',
};

export const navLabel = (lang: string, l: string) => (lang === 'id' ? NAV_ID[l] ?? l : l);

export const flatItems = (items: NavItem[]): NavItem[] => items.flatMap((i) => (i.children ? i.children : [i]));

// Menu yang hak aksesnya dapat diatur per role (grup Superuser dan Overview dikecualikan).
export const PERMISSION_GROUPS = NAV_GROUPS.filter((g) => !g.superuserOnly && !g.direct);
export const ALL_MENU_KEYS = PERMISSION_GROUPS.flatMap((g) => flatItems(g.items).map((i) => i.href));

// Halaman boleh diakses bila cocok dengan menu yang diizinkan (prefix terpanjang menang).
// Halaman di luar daftar menu (mis. Overview) selalu boleh.
export function canAccessPath(allowed: string[] | null, pathname: string): boolean {
  if (allowed === null) return true;
  const match = ALL_MENU_KEYS.filter((k) => pathname === k || pathname.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0];
  return match ? allowed.includes(match) : true;
}

// Saring grup/menu sesuai hak akses. allowed === null berarti akses penuh.
export function filterGroups(groups: NavGroup[], allowed: string[] | null): NavGroup[] {
  if (allowed === null) return groups;
  const ok = (i: NavItem): NavItem | null => {
    if (i.children) {
      const kids = i.children.map(ok).filter(Boolean) as NavItem[];
      return kids.length ? { ...i, children: kids } : null;
    }
    return allowed.includes(i.href) ? i : null;
  };
  return groups
    .map((g) => (g.direct || g.superuserOnly ? g : { ...g, items: g.items.map(ok).filter(Boolean) as NavItem[] }))
    .filter((g) => g.direct || g.superuserOnly || g.items.length > 0);
}
