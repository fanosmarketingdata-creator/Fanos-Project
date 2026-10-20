import type { Metadata } from 'next';
import './globals.css';
import { cookies } from 'next/headers';
import { ToastProvider } from '@/components/Toast';
import I18nProvider from '@/components/I18nProvider';
import { LANG_COOKIE, parseLang } from '@/lib/i18n/lang';

export const metadata: Metadata = {
  title: 'Fanos ERP',
  description: 'Lighting Consultant ERP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = parseLang(cookies().get(LANG_COOKIE)?.value);
  return (
    <html lang={lang} data-i18n="pending" suppressHydrationWarning>
      <head>
        {/* Cadangan: jangan biarkan halaman tersembunyi bila penerjemah gagal berjalan */}
        <script dangerouslySetInnerHTML={{ __html: "setTimeout(function(){document.documentElement.setAttribute('data-i18n','done')},2500)" }} />
        {/* Ikon yang sama dengan sistem lama: Flaticon uicons + Font Awesome */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body className="bg-[#f4f7fb] font-['Segoe_UI',Arial,sans-serif] text-slate-800 antialiased">
        <I18nProvider lang={lang}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
