export type AuditLog = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: 'create' | 'update' | 'delete';
  table_name: string;
  record_id: string | null;
  record_label: string | null;
  changes: Record<string, unknown> | null;
};

export const AUDIT_COLUMNS = 'id, created_at, user_id, user_name, user_role, action, table_name, record_id, record_label, changes';

// Nama tabel -> [Indonesia, Inggris]
const ENTITY: Record<string, [string, string]> = {
  clients: ['Client', 'Client'], vendors: ['Vendor', 'Vendor'], products: ['Produk', 'Product'], projects: ['Project', 'Project'],
  brands: ['Brand', 'Brand'], client_categories: ['Kategori Client', 'Client Category'], product_categories: ['Kategori Produk', 'Product Category'],
  project_classifications: ['Klasifikasi Project', 'Project Classification'], finance_options: ['Opsi Finance', 'Finance Option'],
  quotations: ['Quotation', 'Quotation'], quotation_terms_templates: ['Template Syarat & Ketentuan', 'Terms Template'],
  sales_orders: ['Sales Order', 'Sales Order'], delivery_orders: ['Delivery Order', 'Delivery Order'], invoices: ['Invoice', 'Invoice'],
  payments: ['Pembayaran', 'Payment'], credit_notes: ['Credit Note', 'Credit Note'], credit_note_applications: ['Penerapan Credit Note', 'Credit Note Application'],
  sales_returns: ['Retur Penjualan', 'Sales Return'], packing_lists: ['Packing List', 'Packing List'],
  purchase_orders: ['Purchase Order', 'Purchase Order'], purchase_deliveries: ['Penerimaan Barang', 'Goods Receipt'],
  purchase_invoices: ['Invoice Pembelian', 'Purchase Invoice'], purchase_payments: ['Pembayaran Pembelian', 'Purchase Payment'],
  boq_projects: ['BOQ Project', 'BOQ Project'], boq_akumulasi: ['BOQ Akumulasi', 'BOQ Accumulation'],
  lighting_specifications: ['Spesifikasi Pencahayaan', 'Lighting Specification'], warehouses: ['Gudang', 'Warehouse'],
  stock_transfers: ['Transfer Stok', 'Stock Transfer'], stock_adjustments: ['Penyesuaian Stok', 'Stock Adjustment'],
  pm_projects: ['Project Management', 'Project Management'], team_members: ['Team Member', 'Team Member'], roles: ['Role Group', 'Role Group'],
  app_settings: ['Pengaturan Sistem', 'System Setting'], reminders: ['Pengingat', 'Reminder'], defects: ['Defect', 'Defect'],
};

export const entityLabel = (table: string, en: boolean) => (ENTITY[table]?.[en ? 1 : 0]) ?? table.replace(/_/g, ' ');

export const ACTION_META = {
  create: { id: 'menambahkan', en: 'added', idShort: 'Tambah', enShort: 'Create', icon: 'fi fi-rr-plus', color: '#22c55e' },
  update: { id: 'mengubah', en: 'edited', idShort: 'Ubah', enShort: 'Update', icon: 'fi fi-rr-pencil', color: '#3b82f6' },
  delete: { id: 'menghapus', en: 'deleted', idShort: 'Hapus', enShort: 'Delete', icon: 'fi fi-rr-trash', color: '#ef4444' },
} as const;

export const actionVerb = (a: AuditLog['action'], en: boolean) => ACTION_META[a][en ? 'en' : 'id'];

export function timeAgo(iso: string, en: boolean) {
  const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 45) return en ? 'just now' : 'baru saja';
  const m = Math.round(s / 60);
  if (m < 60) return en ? `${m} min ago` : `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return en ? `${h} h ago` : `${h} jam lalu`;
  const d = Math.round(h / 24);
  return en ? `${d} d ago` : `${d} hari lalu`;
}

export const fmtDateTime = (iso: string, en: boolean) =>
  new Date(iso).toLocaleString(en ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
