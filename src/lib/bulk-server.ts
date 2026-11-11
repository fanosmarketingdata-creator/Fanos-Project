import 'server-only';
import { MAX_IMPORT_ROWS, type ImportResult, type ImportRow } from '@/lib/bulk-import';

export const s = (v: unknown) => String(v ?? '').trim();

// Angka dari sel Excel: terima "1500000", "1.500.000", "1.500.000,50", "Rp 1.500.000", "12,5".
export function parseNum(v: string): number | null {
  let t = s(v).replace(/rp/gi, '').replace(/\s/g, '');
  if (!t) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',') && !t.includes('.')) t = t.replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

// Cocokkan nilai dengan daftar pilihan tanpa peduli huruf besar/kecil; kembalikan penulisan baku.
export function pickOption(v: string, options: string[]): string | null {
  const t = s(v).toLowerCase();
  return options.find((o) => o.toLowerCase() === t) ?? null;
}

export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function checkSize(rows: ImportRow[]): ImportResult | null {
  if (!rows.length) return { total: 0, valid: 0, errors: [], error: 'File tidak berisi data.' };
  if (rows.length > MAX_IMPORT_ROWS) return { total: rows.length, valid: 0, errors: [], error: `Maksimal ${MAX_IMPORT_ROWS} baris per impor.` };
  return null;
}

// --- Upsert berdasarkan ID -------------------------------------------------
// Kolom yang TIDAK ada di file tidak disentuh saat update; kolom ada tapi kosong = dikosongkan.
export function pruneAbsent(payload: Record<string, unknown>, r: ImportRow, map: Record<string, string[]>) {
  const out: Record<string, unknown> = { ...payload };
  for (const [field, cols] of Object.entries(map)) {
    if (!cols.some((c) => (r as Record<string, unknown>)[c] !== undefined)) delete out[field];
  }
  return out;
}

// Jalankan operasi per kelompok kecil agar tidak membanjiri database.
export async function inChunks<T>(items: T[], size: number, fn: (item: T) => Promise<string | null>): Promise<string | null> {
  for (let i = 0; i < items.length; i += size) {
    const res = await Promise.all(items.slice(i, i + size).map(fn));
    const bad = res.find(Boolean);
    if (bad) return bad;
  }
  return null;
}
