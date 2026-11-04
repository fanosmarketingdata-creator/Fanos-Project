// Definisi field spesifikasi produk (M_PRODUCT) yang bertipe MANUAL.
// Dipakai form, detail dan server action supaya 20 field tidak ditulis berulang.

export const SPEC_KEYS = [
  'wattage', 'input_voltage', 'power_factor', 'cct', 'cri', 'beam_angle', 'lumen',
  'ip_rating', 'ik_rating', 'dimming', 'driver_type', 'control_protocol',
  'installation_type', 'housing_material', 'finish', 'warranty',
  'ampere', 'reflector_color', 'body_color', 'dimension', 'cut_out',
] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];

export type SpecField = { key: SpecKey; label: string; placeholder: string; icon: string };

// Field tambahan di bagian Product Information (bukan di grup spesifikasi).
export const INFO_FIELDS: SpecField[] = [
  { key: 'reflector_color', label: 'Warna Reflector', placeholder: 'Silver / Putih', icon: 'fi fi-rr-palette' },
  { key: 'body_color', label: 'Warna Badan Lampu', placeholder: 'Hitam / Putih', icon: 'fi fi-rr-fill' },
  { key: 'dimension', label: 'Dimensi', placeholder: 'Ø90 x 60 mm', icon: 'fi fi-rr-ruler-combined' },
  { key: 'cut_out', label: 'Cut Out', placeholder: 'Ø75 mm', icon: 'fi fi-rr-scissors' },
];

export const SPEC_GROUPS: { title: string; icon: string; fields: SpecField[] }[] = [
  {
    title: 'Spesifikasi Elektrikal',
    icon: 'fi fi-rr-bolt',
    fields: [
      { key: 'wattage', label: 'Wattage (W)', placeholder: '12', icon: 'fi fi-rr-bolt' },
      { key: 'input_voltage', label: 'Input Voltage', placeholder: 'AC 220-240V', icon: 'fi fi-rr-plug' },
      { key: 'power_factor', label: 'Power Factor', placeholder: '> 0.9', icon: 'fi fi-rr-chart-line-up' },
      { key: 'ampere', label: 'Ampere (A)', placeholder: '0.35', icon: 'fi fi-rr-bolt' },
      { key: 'driver_type', label: 'Driver Type', placeholder: 'Constant Current', icon: 'fi fi-rr-microchip' },
    ],
  },
  {
    title: 'Spesifikasi Cahaya',
    icon: 'fi fi-rr-lightbulb-on',
    fields: [
      { key: 'lumen', label: 'Lumen Output (lm)', placeholder: '1200', icon: 'fi fi-rr-sun' },
      { key: 'cct', label: 'CCT (K)', placeholder: '3000', icon: 'fi fi-rr-temperature-high' },
      { key: 'cri', label: 'CRI', placeholder: '> 90', icon: 'fi fi-rr-palette' },
      { key: 'beam_angle', label: 'Beam Angle', placeholder: '36°', icon: 'fi fi-rr-angle' },
    ],
  },
  {
    title: 'Proteksi & Kontrol',
    icon: 'fi fi-rr-shield-check',
    fields: [
      { key: 'ip_rating', label: 'IP Rating', placeholder: 'IP65', icon: 'fi fi-rr-shield-check' },
      { key: 'ik_rating', label: 'IK Rating', placeholder: 'IK08', icon: 'fi fi-rr-shield' },
      { key: 'dimming', label: 'Dimming', placeholder: 'Triac / 0-10V / DALI', icon: 'fi fi-rr-settings-sliders' },
      { key: 'control_protocol', label: 'Control Protocol', placeholder: 'DALI-2 / Zigbee', icon: 'fi fi-rr-wifi' },
    ],
  },
  {
    title: 'Fisik & Instalasi',
    icon: 'fi fi-rr-box',
    fields: [
      { key: 'installation_type', label: 'Installation Type', placeholder: 'Recessed', icon: 'fi fi-rr-tools' },
      { key: 'housing_material', label: 'Housing Material', placeholder: 'Aluminium', icon: 'fi fi-rr-cube' },
      { key: 'finish', label: 'Finish', placeholder: 'White / Black', icon: 'fi fi-rr-fill' },
      { key: 'warranty', label: 'Warranty', placeholder: '2 Tahun', icon: 'fi fi-rr-badge-check' },
    ],
  },
];

// Data pengemasan (numerik + jenis kemasan) untuk Packing List.
export const PACK_NUM_KEYS = ['units_per_package', 'net_weight', 'gross_weight', 'pkg_length_cm', 'pkg_width_cm', 'pkg_height_cm'] as const;
export type PackNumKey = (typeof PACK_NUM_KEYS)[number];

// Gabungan spesifikasi (Elektrikal, Cahaya, Proteksi & Kontrol, Fisik & Instalasi) menjadi baris "Label: nilai".
// Field yang kosong dilewati, tidak ditulis "-".
export function specLines(p: Partial<Record<SpecKey, string | null>> | null | undefined): string[] {
  if (!p) return [];
  const out: string[] = [];
  for (const g of SPEC_GROUPS) for (const f of g.fields) {
    const v = (p[f.key] ?? '').toString().trim();
    if (v) out.push(`${f.label}: ${v}`);
  }
  return out;
}
