// Pembungkus hasil query Supabase di halaman (server component).
// Query yang gagal dilempar sebagai error supaya ditangkap error.tsx (tombol "Coba lagi"),
// bukan diam-diam menampilkan tabel kosong seolah datanya memang belum ada.
type Res = { error: { message: string } | null };

export function orThrow<T extends Res>(res: T): T {
  if (res.error) {
    console.error('[query]', res.error.message);
    throw new Error(res.error.message);
  }
  return res;
}

export function orThrowAll<T extends readonly unknown[]>(results: T): T {
  results.forEach((r) => orThrow(r as Res));
  return results;
}
