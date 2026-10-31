import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
        <i className="fi fi-rr-search-alt" />
      </div>
      <h2 className="mb-1.5 text-lg font-bold text-slate-900">Data tidak ditemukan</h2>
      <p className="mb-5 text-sm text-slate-500">Halaman atau dokumen yang Anda cari tidak ada, atau sudah dihapus.</p>
      <Link href="/dashboard" className="btn btn-primary">Ke Dashboard</Link>
    </div>
  );
}
