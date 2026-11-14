// Kerangka halaman yang tampil INSTAN saat pindah halaman / klik tombol
// "Tambah ...", sementara server masih mengambil data dari Supabase.
// Bentuknya meniru halaman aslinya (daftar tabel, daftar kartu, form, dashboard)
// supaya tidak "melompat" saat data tiba. Dipakai lewat loading.tsx di tiap segmen route.
function Bar({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`sk ${className}`} style={style} />;
}

function Toolbar() {
  return (
    <div className="sk-toolbar">
      <div className="sk-title"><Bar className="h-8 w-8 !rounded-lg" /><Bar className="h-4 w-36" /></div>
      <Bar className="sk-search h-9 !rounded-full" />
      <div className="sk-btns"><Bar className="h-9 w-24 !rounded-[10px]" /><Bar className="h-9 w-28 !rounded-[10px]" /></div>
    </div>
  );
}

function Footer() {
  return (
    <div className="sk-footer">
      <Bar className="h-3.5 w-40" />
      <div className="flex gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => <Bar key={i} className="h-8 w-8 !rounded-lg" />)}
        <Bar className="ml-2 h-8 w-16 !rounded-lg" />
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-start justify-between gap-4">
        <div><Bar className="mb-2 h-7 w-64" /><Bar className="h-3.5 w-80 max-w-full" /></div>
        <Bar className="h-8 w-44 !rounded-lg" />
      </div>
      <div className="sk-kpis">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sk-panel flex gap-3.5">
            <Bar className="h-11 w-11 shrink-0 !rounded-xl" />
            <div className="flex-1"><Bar className="mb-2.5 h-3 w-28" /><Bar className="mb-2.5 h-6 w-36" /><Bar className="h-3 w-32" /></div>
          </div>
        ))}
      </div>
      <div className="sk-grid sk-g-7-5">
        <div className="sk-panel"><Bar className="mb-4 h-4 w-44" /><Bar className="h-60 w-full !rounded-xl" /></div>
        <div className="sk-panel"><Bar className="mb-4 h-4 w-36" /><Bar className="mx-auto my-4 h-40 w-40 !rounded-full" /><Bar className="h-3 w-full" /></div>
      </div>
      <div className="sk-grid sk-g-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="sk-panel">
            <Bar className="mb-4 h-4 w-40" />
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="mb-3 flex items-center gap-3 last:mb-0">
                <Bar className="h-9 w-9 shrink-0 !rounded-lg" />
                <div className="flex-1"><Bar className="mb-1.5 h-3 w-3/4" /><Bar className="h-2.5 w-1/2" /></div>
                <Bar className="h-5 w-14 !rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export default function PageSkeleton({ variant = 'list' }: { variant?: 'list' | 'cards' | 'form' | 'dashboard' }) {
  return (
    <div className="sk-wrap" aria-busy="true" aria-label="Memuat halaman">
      {variant === 'dashboard' && <Dashboard />}

      {variant === 'list' && (
        <div className="sk-card">
          <Toolbar />
          <div className="sk-body">
            <div className="sk-row sk-thead">
              {[2, 1, 1, 1, 1].map((f, i) => <Bar key={i} className="h-3" style={{ flex: f }} />)}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="sk-row">
                {[2, 1, 1, 1, 1].map((f, j) => <Bar key={j} className="h-4" style={{ flex: f }} />)}
              </div>
            ))}
          </div>
          <Footer />
        </div>
      )}

      {variant === 'cards' && (
        <div className="sk-card">
          <Toolbar />
          <div className="sk-body">
            <div className="sk-cardhead">
              <div style={{ width: 46 }} /><Bar className="h-3 w-24" style={{ flex: 1 }} />
              <div className="sk-meta">{Array.from({ length: 4 }).map((_, i) => <Bar key={i} className="h-3 w-3/4" />)}</div>
              <div style={{ width: 72 }} />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sk-crow">
                <Bar className="h-[46px] w-[46px] shrink-0 !rounded-xl" />
                <div style={{ flex: 1, minWidth: 0 }}><Bar className="mb-2 h-4 w-3/4" /><Bar className="h-3 w-1/2" /></div>
                <div className="sk-meta">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j}><Bar className="mb-1.5 h-2.5 w-1/2" /><Bar className="h-3.5 w-5/6" /></div>
                  ))}
                </div>
                <div className="flex gap-1.5" style={{ width: 72, justifyContent: 'flex-end' }}>
                  <Bar className="h-8 w-8 !rounded-lg" /><Bar className="h-8 w-8 !rounded-lg" />
                </div>
              </div>
            ))}
          </div>
          <Footer />
        </div>
      )}

      {variant === 'form' && (
        <>
          <div className="mb-4 flex items-center gap-2.5"><Bar className="h-8 w-8 !rounded-lg" /><Bar className="h-5 w-48" /></div>
          <div className="sk-card mb-4 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}><Bar className="mb-2 h-3 w-24" /><Bar className="h-10 w-full !rounded-[10px]" /></div>
            ))}
          </div>
          <div className="sk-card p-5">
            <Bar className="mb-4 h-4 w-32" />
            {Array.from({ length: 3 }).map((_, i) => <Bar key={i} className="mb-3 h-10 w-full !rounded-[10px] last:mb-0" />)}
          </div>
          <div className="mt-4 flex justify-end gap-2"><Bar className="h-9 w-24 !rounded-[10px]" /><Bar className="h-9 w-28 !rounded-[10px]" /></div>
        </>
      )}
    </div>
  );
}
