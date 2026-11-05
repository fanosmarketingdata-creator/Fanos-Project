export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[210mm]" data-no-i18n>
      <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="rounded-xl bg-white p-8 shadow">
        <div className="mb-6 flex justify-between">
          <div className="h-10 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-32 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="mx-auto mb-6 h-5 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mb-3 h-8 w-full animate-pulse rounded bg-slate-300" />
        <div className="h-64 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
