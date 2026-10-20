'use client';

import { useRouter } from 'next/navigation';

// Baris tabel yang membuka detail saat diklik (tombol/tautan di dalamnya tetap berfungsi).
export default function ClickRow({ href, className = '', children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className={`clickable-row ${className}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a,button,input,select')) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
