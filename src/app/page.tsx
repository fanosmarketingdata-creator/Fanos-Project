import { redirect } from 'next/navigation';

// Middleware sudah menangani redirect ke /login atau /dashboard sesuai
// status login, jadi halaman root ini cukup titik masuk default.
export default function RootPage() {
  redirect('/dashboard');
}
