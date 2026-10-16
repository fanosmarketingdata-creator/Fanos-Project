import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

export const metadata: Metadata = {
  title: 'Fanos ERP',
  description: 'Lighting Consultant ERP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        {/* Ikon yang sama dengan sistem lama: Flaticon uicons + Font Awesome */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body className="bg-[#f4f7fb] font-['Segoe_UI',Arial,sans-serif] text-slate-800 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
