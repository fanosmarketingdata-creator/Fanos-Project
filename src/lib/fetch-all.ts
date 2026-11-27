// Supabase/PostgREST membatasi satu kueri maksimal 1000 baris. Helper ini mengambil
// semua halaman (range) sampai habis. `build` harus membuat kueri BARU setiap dipanggil.
export async function fetchAll<T = any>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: any; error: any }> },
  pageSize = 1000,
  maxRows = 50000,
): Promise<{ data: T[]; error: any }> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) return { data: out, error };
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return { data: out, error: null };
}
