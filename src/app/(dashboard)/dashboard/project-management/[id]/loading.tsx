export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true">
      <div className="mb-2 h-8 w-56 rounded bg-slate-200" />
      <div className="mb-6 h-4 w-96 max-w-full rounded bg-slate-100" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 rounded-2xl bg-slate-100" />)}
      </div>
    </div>
  );
}
