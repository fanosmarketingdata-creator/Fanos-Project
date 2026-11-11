// Tipe + helper bersama untuk fitur Bulk Import (aman dipakai di client maupun server).
export type ImportColumn = {
  key: string;
  label: string;          // judul kolom di template
  required?: boolean;
  example?: string;
  note?: string;          // keterangan di sheet Petunjuk
  options?: string[];     // pilihan nilai yang diizinkan
};

export type ImportRow = Record<string, string> & { _row: number };

export type ImportResult = {
  total: number;
  valid: number;
  errors: { row: number; message: string }[];
  added?: number;   // jumlah data baru (ID kosong / ID belum ada)
  updated?: number; // jumlah data lama yang ditimpa (ID sudah ada)
  inserted?: number;
  error?: string; // kegagalan menyeluruh (mis. tidak punya izin)
};

export const MAX_IMPORT_ROWS = 1000;

// Normalisasi judul kolom supaya "Company Name *", "company_name" dan "Company name" dianggap sama.
export const normHeader = (s: unknown) => String(s ?? '').toLowerCase().replace(/\*/g, '').replace(/[^a-z0-9]+/g, '');
