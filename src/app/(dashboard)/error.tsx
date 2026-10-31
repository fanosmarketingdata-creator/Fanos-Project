'use client';

import Link from 'next/link';
import { useEffect } from 'react';

// Ditampilkan di area konten bila halaman dashboard gagal dimuat (query gagal, dll.).
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-500">
        <i className="fi fi-rr-triangle-warning" />
      </div>
      <h2 className="mb-1.5 text-lg font-bold text-slate-900">Halaman gagal dimuat</h2>
      <p className="mb-5 text-sm text-slate-500">
        Terjadi kendala saat mengambil data. Periksa koneksi Anda lalu coba lagi. Jika terus berulang, hubungi admin sistem.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          <i className="fi fi-rr-refresh" /> Coba lagi
        </button>
        <Link href="/dashboard" className="btn btn-secondary">Ke Dashboard</Link>
      </div>
      {error.digest && <p className="mt-5 text-[11px] text-slate-400">Kode error: {error.digest}</p>}
    </div>
  );
}
