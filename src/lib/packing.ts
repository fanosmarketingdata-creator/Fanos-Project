export const PACKAGE_TYPES = ['Carton', 'Pallet', 'Box', 'Crate', 'Bag', 'Roll', 'Bundle', 'Drum', 'Other'] as const;
export const PACKAGE_TYPE_ID: Record<string, string> = { Carton: 'Karton', Pallet: 'Palet', Box: 'Boks', Crate: 'Peti', Bag: 'Karung', Roll: 'Rol', Bundle: 'Ikat', Drum: 'Drum', Other: 'Lainnya' };

// CBM satu baris = (P x L x T dalam cm) / 1.000.000 x jumlah kemasan.
export const calcCbm = (l: number, w: number, h: number, packages: number) => Math.round(((l * w * h) / 1_000_000) * packages * 10000) / 10000;

// "15 Carton / 2 Pallet"
export function packageSummary(lines: { package_type: string; packages: number }[], lang: 'id' | 'en' = 'en') {
  const m = new Map<string, number>();
  lines.forEach((l) => m.set(l.package_type, (m.get(l.package_type) ?? 0) + Number(l.packages)));
  const parts = Array.from(m.entries()).filter(([, n]) => n > 0).map(([t, n]) => `${n} ${lang === 'id' ? PACKAGE_TYPE_ID[t] ?? t : t}`);
  return parts.length ? parts.join(' / ') : '-';
}
