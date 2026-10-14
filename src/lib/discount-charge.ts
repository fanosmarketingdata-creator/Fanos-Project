// Tipe & rumus diskon/biaya tambahan. Sengaja DI LUAR komponen 'use client'
// supaya bisa dipakai di Server Action maupun di browser. (Fungsi yang
// di-export dari file 'use client' tidak bisa dipanggil dari server.)
export type DiscountLine = { label: string; percent: number };
export type ChargeLine = { label: string; amount: number };

export function sumDiscountPercent(lines: DiscountLine[]) {
  return lines.reduce((s, d) => s + (d.percent || 0), 0);
}

export function sumChargeAmount(lines: ChargeLine[]) {
  return lines.reduce((s, c) => s + (c.amount || 0), 0);
}
