// Definisi field spesifikasi produk (M_PRODUCT) yang bertipe MANUAL.
// Dipakai form, detail dan server action supaya 20 field tidak ditulis berulang.

export const SPEC_KEYS = [
  'wattage', 'input_voltage', 'power_factor', 'cct', 'cri', 'beam_angle', 'lumen',
  'ip_rating', 'ik_rating', 'dimming', 'driver_type', 'control_protocol',
  'installation_type', 'housing_material', 'finish', 'warranty',
] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];

export type SpecField = { key: SpecKey; label: string; placeholder: string; icon: string };

export const SPEC_GROUPS: { title: string; icon: string; fields: SpecField[] }[] = [
  {
    title: 'Spesifikasi Elektrikal',
    icon: 'fi fi-rr-bolt',
    fields: [
      { key: 'wattage', label: 'Wattage (W)', placeholder: '12', icon: 'fi fi-rr-bolt' },
      { key: 'input_voltage', label: 'Input Voltage', placeholder: 'AC 220-240V', icon: 'fi fi-rr-plug' },
      { key: 'power_factor', label: 'Power Factor', placeholder: '> 0.9', icon: 'fi fi-rr-chart-line-up' },
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
