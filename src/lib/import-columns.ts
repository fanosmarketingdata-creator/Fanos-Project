import type { ImportColumn } from '@/lib/bulk-import';
import { CREDIT_LIMIT_OPTIONS, PRODUCT_APPLICATION_OPTIONS, PRODUCT_CATEGORIES, PROJECT_TRIGGER_OPTIONS, PROJECT_TYPE_OPTIONS, TOP_OPTIONS, UOM_OPTIONS } from '@/lib/master-options';
import { PACKAGE_TYPES } from '@/lib/packing';
import { INFO_FIELDS, SPEC_GROUPS } from '@/app/(dashboard)/dashboard/products/fields';

export function clientColumns(categories: string[] = []): ImportColumn[] {
  return [
  { key: 'client_no', label: 'Client ID', note: 'Kunci pencocokan. ID sudah ada = data lama DITIMPA isi file; ID belum ada / kosong = data BARU (kosong → ID dibuat otomatis). Untuk update massal: Export dulu, ubah, lalu Import.', example: '' },
  { key: 'company', label: 'Company Name', required: true, example: 'PT Contoh Sejahtera', note: 'Nama perusahaan. Tidak boleh sama dengan client yang sudah ada.' },
  { key: 'address', label: 'Company Address', example: 'Jl. Sudirman No. 1, Jakarta' },
  { key: 'category', label: 'Category', options: categories, note: 'Sesuai menu Client Category. Kosong = tanpa kategori.' },
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
}

export const VENDOR_COLUMNS: ImportColumn[] = [
  { key: 'vendor_no', label: 'Vendor ID', note: 'Kunci pencocokan. ID sudah ada = data lama DITIMPA isi file; ID belum ada / kosong = data BARU (kosong → ID otomatis).' },
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
    { key: 'project_no', label: 'Project ID', note: 'Kunci pencocokan. ID sudah ada = data lama DITIMPA isi file; ID belum ada / kosong = data BARU (kosong → ID otomatis).' },
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

export function productColumns(categories: Record<string, string[]> = PRODUCT_CATEGORIES): ImportColumn[] {
  return [
  { key: 'sku', label: 'SKU No', note: 'Kunci pencocokan. SKU sudah ada = data lama DITIMPA isi file (harga kosong = tidak diubah); SKU belum ada = produk BARU dengan SKU tersebut; KOSONG = produk baru, SKU dibuat otomatis (3 huruf Brand + nomor lanjutan, mis. FAN-00123).' },
  { key: 'name', label: 'Product Name', required: true, example: 'Downlight Recessed 12W', note: 'Kombinasi nama + brand tidak boleh sama dengan produk yang sudah ada. SKU dibuat otomatis oleh sistem.' },
  { key: 'brand', label: 'Brand', example: 'FANOS', note: 'Kosong = FANOS. Brand yang belum ada akan dibuat otomatis.' },
  { key: 'category', label: 'Main Category', required: true, options: Object.keys(categories), example: Object.keys(categories)[0] },
  { key: 'subcategory', label: 'Subcategory', options: Object.entries(categories).map(([c, subs]) => `${c}: ${subs.join(', ')}`), note: 'Harus bagian dari Main Category pada baris yang sama.' },
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
  { key: 'cost_price', label: 'Cost Price', example: '85000', note: 'Opsional, angka rupiah per UOM. Isi BERSAMAAN dengan Selling Price agar produk otomatis masuk Price List; kosongkan keduanya bila belum ingin masuk Price List.' },
  { key: 'price', label: 'Selling Price', example: '125000', note: 'Opsional, Standard Selling Price per UOM. Lihat catatan Cost Price.' },
  { key: 'notes', label: 'Notes', example: '' },
  ];
}


// Sales Order: SATU BARIS = SATU ITEM. Baris dengan SO No yang sama digabung menjadi satu Sales Order.
export const SO_COLUMNS: ImportColumn[] = [
  { key: 'so_no', label: 'SO No', note: 'Kunci pencocokan. SO No sudah ada = Sales Order lama DITIMPA (hanya yang berstatus DRAFT; item lama diganti isi file); SO No belum ada = Sales Order BARU dengan nomor itu; KOSONG = Sales Order baru, nomor dibuat otomatis (baris kosong berurutan dengan Client & Tanggal sama digabung jadi satu SO).', example: '' },
  { key: 'so_date', label: 'SO Date', required: true, note: 'Format tanggal: 2026-11-13 atau 13/11/2026.', example: '2026-11-13' },
  { key: 'client_no', label: 'Client ID', note: 'Isi Client ID ATAU Client Name. Pada SO lama, boleh dikosongkan (client tidak berubah).', example: 'CL-0001' },
  { key: 'client_name', label: 'Client Name', note: 'Nama perusahaan persis seperti di Client Master.', example: 'PT Contoh Sejahtera' },
  { key: 'global_notes', label: 'Notes', note: 'Catatan Sales Order (cukup di baris pertama tiap SO).', example: '' },
  { key: 'sku', label: 'SKU', required: true, note: 'SKU produk yang sudah ada di Catalogue.', example: 'FAN-00001' },
  { key: 'qty', label: 'Qty', required: true, note: 'Jumlah, harus lebih dari 0.', example: '10' },
  { key: 'unit_price', label: 'Unit Price', note: 'Harga satuan. Kosong = pakai harga jual dari Price List (produk harus sudah ada di Price List).', example: '150000' },
  { key: 'item_notes', label: 'Item Notes', note: 'Catatan per item.', example: '' },
  { key: 'product_name', label: 'Product Name', note: 'Informasi saja (hasil Export), diabaikan saat impor.', example: '' },
  { key: 'item_total', label: 'Item Total', note: 'Informasi saja (hasil Export), diabaikan saat impor.', example: '' },
  { key: 'status', label: 'Status', note: 'Informasi saja (hasil Export), diabaikan saat impor. SO baru selalu berstatus DRAFT.', example: '' },
  { key: 'so_total', label: 'SO Total', note: 'Informasi saja (hasil Export): total setelah diskon/pajak/biaya. Dihitung ulang saat impor.', example: '' },
];
