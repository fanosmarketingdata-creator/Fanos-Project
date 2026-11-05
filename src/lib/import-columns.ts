import type { ImportColumn } from '@/lib/bulk-import';
import { CREDIT_LIMIT_OPTIONS, PRODUCT_APPLICATION_OPTIONS, PRODUCT_CATEGORIES, PROJECT_TRIGGER_OPTIONS, PROJECT_TYPE_OPTIONS, TOP_OPTIONS, UOM_OPTIONS } from '@/lib/master-options';
import { PACKAGE_TYPES } from '@/lib/packing';
import { INFO_FIELDS, SPEC_GROUPS } from '@/app/(dashboard)/dashboard/products/fields';

export const CLIENT_COLUMNS: ImportColumn[] = [
  { key: 'company', label: 'Company Name', required: true, example: 'PT Contoh Sejahtera', note: 'Nama perusahaan. Tidak boleh sama dengan client yang sudah ada.' },
  { key: 'address', label: 'Company Address', example: 'Jl. Sudirman No. 1, Jakarta' },
  { key: 'status', label: 'Status', options: ['Active', 'Inactive', 'Blacklist', 'Unverified'], example: 'Active', note: 'Kosong = Unverified.' },
  { key: 'credit_limit', label: 'Credit Limit', example: '10000000', note: `Angka rupiah tanpa titik/teks. Contoh nilai umum: ${CREDIT_LIMIT_OPTIONS.map((o) => o.value).join(', ')}.` },
  { key: 'contact_name', label: 'Contact Person', example: 'Budi Santoso', note: 'Kontak utama.' },
  { key: 'position', label: 'Position', example: 'Purchasing Manager' },
  { key: 'phone', label: 'Phone', example: '081234567890' },
  { key: 'email', label: 'Email', example: 'budi@contoh.co.id' },
  { key: 'contact2_name', label: 'Contact Person 2', note: 'Opsional: kontak kedua.' },
  { key: 'contact2_position', label: 'Position 2' },
  { key: 'contact2_phone', label: 'Phone 2' },
  { key: 'contact2_email', label: 'Email 2' },
];

export const VENDOR_COLUMNS: ImportColumn[] = [
  { key: 'company', label: 'Company Name', required: true, example: 'PT Supplier Lampu', note: 'Tidak boleh sama dengan vendor yang sudah ada.' },
  { key: 'contact_name', label: 'Contact Person', example: 'Sari Wulandari' },
  { key: 'position', label: 'Position', example: 'Sales' },
  { key: 'top', label: 'TOP', options: TOP_OPTIONS, example: 'Net 30 Hari', note: 'Term of Payment.' },
  { key: 'phone', label: 'Phone', example: '081234567890' },
  { key: 'email', label: 'Email', example: 'sari@supplier.co.id' },
  { key: 'address', label: 'Address', example: 'Kawasan Industri Jababeka, Bekasi' },
];

export function projectColumns(classifications: string[]): ImportColumn[] {
  return [
    { key: 'name', label: 'Project Name', required: true, example: 'Hotel Santika Lobby' },
    { key: 'location', label: 'Location', example: 'Bandung' },
    { key: 'classification', label: 'Classification', options: classifications, note: 'Sesuai menu Project Classification.' },
    { key: 'project_type', label: 'Project Type', options: PROJECT_TYPE_OPTIONS, example: 'Hospitality' },
    { key: 'client_company', label: 'Client Company', example: 'PT Contoh Sejahtera', note: 'Harus sama persis dengan Company Name di Master Client. Impor client terlebih dahulu bila belum ada.' },
    { key: 'trigger_source', label: 'Trigger', options: PROJECT_TRIGGER_OPTIONS, example: 'Arsitek' },
    { key: 'triggered_by', label: 'Triggered By', example: 'Andi (Studio Arsitek X)', note: 'Nama pemicu proyek (teks bebas).' },
    { key: 'top', label: 'TOP', note: 'Sesuai master Payment Term (menu Finance).', example: 'Net 30 Hari' },
    { key: 'cashback', label: 'Cashback', note: 'Sesuai master Cashback (menu Finance).' },
  ];
}

const specCols: ImportColumn[] = SPEC_GROUPS.flatMap((g) => g.fields.map((f) => ({ key: f.key, label: f.label, example: f.placeholder, note: g.title })));

export const PRODUCT_COLUMNS: ImportColumn[] = [
  { key: 'name', label: 'Product Name', required: true, example: 'Downlight Recessed 12W', note: 'Kombinasi nama + brand tidak boleh sama dengan produk yang sudah ada. SKU dibuat otomatis oleh sistem.' },
  { key: 'brand', label: 'Brand', example: 'FANOS', note: 'Kosong = FANOS. Brand yang belum ada akan dibuat otomatis.' },
  { key: 'category', label: 'Main Category', required: true, options: Object.keys(PRODUCT_CATEGORIES), example: Object.keys(PRODUCT_CATEGORIES)[0] },
  { key: 'subcategory', label: 'Subcategory', options: Object.entries(PRODUCT_CATEGORIES).map(([c, subs]) => `${c}: ${subs.join(', ')}`), note: 'Harus bagian dari Main Category pada baris yang sama.' },
  { key: 'application', label: 'Application', options: PRODUCT_APPLICATION_OPTIONS },
  { key: 'uom', label: 'UOM', options: UOM_OPTIONS, example: 'Pcs', note: 'Kosong = Pcs.' },
  ...INFO_FIELDS.map((f) => ({ key: f.key as string, label: f.label, example: f.placeholder, note: 'Product Information' })),
  ...specCols,
  { key: 'package_type', label: 'Jenis Kemasan', options: [...PACKAGE_TYPES], example: 'Carton', note: 'Kosong = Carton.' },
  { key: 'units_per_package', label: 'Isi per Kemasan', example: '20', note: 'Angka.' },
  { key: 'net_weight', label: 'Berat Bersih / Unit (Kg)', example: '0.3', note: 'Angka.' },
  { key: 'gross_weight', label: 'Berat Kotor / Kemasan (Kg)', example: '7', note: 'Angka. Tidak boleh lebih kecil dari berat bersih × isi per kemasan.' },
  { key: 'pkg_length_cm', label: 'Panjang Kemasan (cm)', example: '40', note: 'Angka.' },
  { key: 'pkg_width_cm', label: 'Lebar Kemasan (cm)', example: '30', note: 'Angka.' },
  { key: 'pkg_height_cm', label: 'Tinggi Kemasan (cm)', example: '25', note: 'Angka.' },
  { key: 'notes', label: 'Notes', example: '' },
];

export const PRICE_COLUMNS: ImportColumn[] = [
  { key: 'sku', label: 'SKU', required: true, example: 'FNS-DL-0012', note: 'Harus sudah ada di Product Catalogue. Jangan diubah.' },
  { key: 'name', label: 'Product Name (info)', note: 'Hanya informasi, tidak diimpor.' },
  { key: 'cost_price', label: 'Cost Price', required: true, example: '85000', note: 'Angka rupiah per UOM.' },
  { key: 'price', label: 'Selling Price', required: true, example: '125000', note: 'Standard Selling Price, angka rupiah per UOM.' },
];
