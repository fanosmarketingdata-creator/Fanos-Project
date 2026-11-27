// Ubah error Postgres/Supabase menjadi pesan yang mudah dipahami pengguna (Bahasa Indonesia).
type DbErr = { message?: string; code?: string; details?: string | null } | null | undefined;

export function friendlyError(err: DbErr | string): string {
  if (!err) return 'Terjadi kesalahan.';
  const e: DbErr = typeof err === 'string' ? { message: err } : err;
  const msg = e?.message ?? '';
  const code = e?.code ?? '';
  if (code === '23503' || /violates foreign key constraint/i.test(msg)) {
    return /still referenced|is still referenced/i.test(msg + (e?.details ?? ''))
      ? 'Data ini masih digunakan oleh data lain sehingga tidak dapat dihapus.'
      : 'Data yang dipilih tidak ditemukan atau sudah dihapus. Muat ulang halaman lalu coba lagi.';
  }
  if (code === '23505' || /duplicate key value/i.test(msg)) return 'Data tersebut sudah terdaftar (duplikat).';
  if (code === '23502' || /null value in column/i.test(msg)) return 'Ada kolom wajib yang belum diisi.';
  if (code === '23514' || /violates check constraint/i.test(msg)) return 'Ada nilai yang tidak valid. Periksa kembali isian Anda.';
  if (code === '22P02' || /invalid input syntax/i.test(msg)) return `Format isian tidak valid. Periksa kembali isian Anda. (${msg.replace(/^invalid input syntax for /i, '')})`;
  if (code === '22003' || /out of range|numeric field overflow/i.test(msg)) return `Angka terlalu besar atau di luar batas yang diizinkan. (${msg})`;
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) return 'Role Anda tidak memiliki izin untuk melakukan tindakan ini.';
  if (/JWT expired|not authenticated|Auth session missing/i.test(msg)) return 'Sesi Anda telah berakhir. Silakan login kembali.';
  if (/fetch failed|network|timeout|ECONN/i.test(msg)) return 'Koneksi ke server bermasalah. Coba lagi beberapa saat.';
  return msg || 'Terjadi kesalahan.';
}
