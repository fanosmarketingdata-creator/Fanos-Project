// Pilihan untuk field bertipe PRE-DETERMINED di Master Data.
// Ubah daftar di file ini bila perusahaan punya standar pilihan sendiri —
// semua form (Client, Vendor, Product, Project) membaca dari sini.

export const TOP_OPTIONS = [
  'Cash',
  'COD',
  'DP 50% - Pelunasan 50%',
  'DP 30% - Pelunasan 70%',
  'Net 7 Hari',
  'Net 14 Hari',
  'Net 30 Hari',
  'Net 45 Hari',
  'Net 60 Hari',
];

// Credit Limit (Rp) — tersimpan sebagai angka.
export const CREDIT_LIMIT_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Tanpa Kredit (Cash)' },
  { value: 10_000_000, label: 'Rp 10.000.000' },
  { value: 25_000_000, label: 'Rp 25.000.000' },
  { value: 50_000_000, label: 'Rp 50.000.000' },
  { value: 100_000_000, label: 'Rp 100.000.000' },
  { value: 250_000_000, label: 'Rp 250.000.000' },
  { value: 500_000_000, label: 'Rp 500.000.000' },
  { value: 1_000_000_000, label: 'Rp 1.000.000.000' },
];

export const PROJECT_TYPE_OPTIONS = [
  'Residential',
  'Commercial',
  'Hospitality',
  'Office',
  'Retail',
  'Industrial',
  'Public / Institutional',
  'Outdoor / Landscape',
];

// "Trigger" = siapa/sumber yang memicu proyek masuk.
export const PROJECT_TRIGGER_OPTIONS = [
  'Arsitek',
  'Interior Designer',
  'Lighting Designer',
  'Kontraktor',
  'Konsultan MEP',
  'Owner',
  'Developer',
  'Referral',
  'Walk-in / Direct',
];

export const UOM_OPTIONS = ['Pcs', 'Set', 'Unit', 'Meter', 'Roll', 'Box', 'Lot'];

export const PRODUCT_APPLICATION_OPTIONS = [
  'Residential',
  'Commercial',
  'Hospitality',
  'Office',
  'Retail',
  'Industrial',
  'Outdoor / Landscape',
];

// Main Category -> daftar Subcategory (dropdown bertingkat).
export const PRODUCT_CATEGORIES: Record<string, string[]> = {
  Indoor: ['Downlight', 'Spotlight', 'Track Light', 'Panel Light', 'Linear Light', 'LED Strip', 'Bulb / Lamp', 'Tube'],
  Outdoor: ['Floodlight', 'Bollard', 'Wall Light Outdoor', 'Street Light', 'Inground', 'Underwater', 'Garden Light'],
  Decorative: ['Pendant', 'Chandelier', 'Wall Lamp', 'Table Lamp', 'Floor Lamp'],
  'Control & Driver': ['Driver', 'Controller', 'Sensor', 'Dimmer'],
  Accessories: ['Profile', 'Cable', 'Connector', 'Mounting'],
};

export const BRAND_DEFAULT = 'FANOS';
