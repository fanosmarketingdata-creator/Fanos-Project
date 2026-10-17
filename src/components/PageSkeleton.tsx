// Kerangka halaman yang tampil INSTAN saat pindah halaman / klik tombol
// "Tambah ...", sementara server masih mengambil data dari Supabase.
// Dipakai lewat loading.tsx di setiap segmen route — Next.js juga
// mem-prefetch kerangka ini di background, jadi klik pertama pun terasa cepat.
function Bar({ className = '' }: { className?: string }) {
  return <div className={`rounded bg-slate-200/80 ${className}`} />;
}

export default function PageSkeleton({ variant = 'list' }: { variant?: 'list' | 'form' }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Memuat halaman">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
        <Bar className="h-5 w-5 rounded-md" />
        <Bar className="h-4 w-44" />
      </div>

      {variant === 'list' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Bar className="h-9 w-full max-w-xs rounded-full" />
            <Bar className="h-9 w-28 rounded-[10px]" />
          </div>
          <div className="rounded-[14px] border border-slate-200 bg-white p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-3 flex gap-4 last:mb-0">
                <Bar className="h-8 flex-[2]" />
                <Bar className="hidden h-8 flex-1 sm:block" />
                <Bar className="hidden h-8 flex-1 sm:block" />
                <Bar className="h-8 w-20" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 rounded-[14px] border border-slate-200 bg-white p-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Bar className="mb-2 h-3 w-24" />
                <Bar className="h-10 w-full rounded-[10px]" />
              </div>
            ))}
          </div>
          <div className="rounded-[14px] border border-slate-200 bg-white p-5">
            <Bar className="mb-4 h-4 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Bar key={i} className="mb-3 h-10 w-full rounded-[10px] last:mb-0" />
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Bar className="h-9 w-24 rounded-[10px]" />
            <Bar className="h-9 w-28 rounded-[10px]" />
          </div>
        </>
      )}
    </div>
  );
}
