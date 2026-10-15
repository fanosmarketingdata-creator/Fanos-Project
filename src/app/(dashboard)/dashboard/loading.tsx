// Dipakai Next.js sebagai fallback instan saat pindah antar halaman dashboard.
// Tanpa file ini, klik menu terasa "diam" sampai server selesai query data;
// dengan ini, kerangka halaman langsung tampil dan Link bisa di-prefetch.
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="mb-2 h-6 w-48 rounded bg-slate-200" />
      <div className="mb-6 h-4 w-80 rounded bg-slate-100" />
      <div className="mb-4 flex justify-between gap-3">
        <div className="h-9 w-64 rounded-lg bg-slate-200" />
        <div className="h-9 w-32 rounded-lg bg-slate-200" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-3 h-8 rounded bg-slate-100 last:mb-0" />
        ))}
      </div>
    </div>
  );
}
