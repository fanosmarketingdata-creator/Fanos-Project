// Tipe & rumus diskon/pajak/biaya tambahan. Sengaja DI LUAR komponen 'use client'
// supaya bisa dipakai di Server Action maupun di browser. (Fungsi yang
// di-export dari file 'use client' tidak bisa dipanggil dari server.)
//
// Rumus: Grand Total = Subtotal - Diskon + Pajak (+ Biaya Tambahan).
// Diskon (-) menghitung % dari Subtotal; Pajak (+) menghitung % dari (Subtotal - Diskon).
// Baris tanpa `kind` (data lama) dianggap Diskon.
export type DiscountLine = { label: string; percent: number; kind?: 'discount' | 'tax' };
export type ChargeLine = { label: string; amount: number };

export const isTax = (l: { kind?: string }) => l.kind === 'tax';

export function sumDiscountPercent(lines: DiscountLine[]) {
  return lines.filter((d) => !isTax(d)).reduce((s, d) => s + (d.percent || 0), 0);
}

export function sumTaxPercent(lines: DiscountLine[]) {
  return lines.filter(isTax).reduce((s, d) => s + (d.percent || 0), 0);
}

export function sumChargeAmount(lines: ChargeLine[]) {
  return lines.reduce((s, c) => s + (c.amount || 0), 0);
}

// Jumlah pajak dari dasar pengenaan (Subtotal - Diskon).
export function sumTaxAmount(subtotal: number, lines: DiscountLine[]) {
  const base = subtotal * (1 - sumDiscountPercent(lines) / 100);
  return (base * sumTaxPercent(lines)) / 100;
}
