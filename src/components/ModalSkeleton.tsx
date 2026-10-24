// Kerangka modal layar penuh yang tampil INSTAN saat tombol Tambah / Edit / Detail diklik,
// sebelum data dari server siap. Bentuknya sama dengan FullModal, jadi tidak ada lagi
// "kerangka halaman dulu, baru modal muncul": modalnya langsung terbuka dan isinya terisi menyusul.
function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200/80 ${className}`} />;
}

export default function ModalSkeleton() {
  return (
    <div className="modal-overlay modal-full-overlay" aria-busy="true" aria-label="Memuat">
      <div className="modal modal-full" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3><Bar className="h-5 w-48 !bg-white/40" /></h3>
        </div>
        <div className="modal-body">
          <div className="modal-inner">
            <div className="mb-4 grid grid-cols-1 gap-4 rounded-[14px] border border-slate-200 bg-white p-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Bar className="mb-2 h-3 w-24" />
                  <Bar className="h-10 w-full rounded-[10px]" />
                </div>
              ))}
            </div>
            <div className="rounded-[14px] border border-slate-200 bg-white p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mb-3 flex gap-4 last:mb-0">
                  <Bar className="h-8 flex-[2]" />
                  <Bar className="hidden h-8 flex-1 sm:block" />
                  <Bar className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <Bar className="h-9 w-20 rounded-[10px]" />
          <Bar className="h-9 w-28 rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
