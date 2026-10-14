'use client';

import Link from 'next/link';

// Toolbar di atas dokumen — disembunyikan saat dicetak (print:hidden).
export default function PrintToolbar({ backHref, docNo }: { backHref: string; docNo?: string | null }) {
  return (
    <div className="mx-auto mb-4 flex w-full max-w-[210mm] items-center justify-between print:hidden">
      <Link href={backHref} className="text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Kembali
      </Link>
      <div className="flex items-center gap-3">
        {docNo && <span className="text-xs text-slate-400">{docNo}</span>}
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
        >
          🖨️ Cetak / Simpan PDF
        </button>
      </div>
    </div>
  );
}
