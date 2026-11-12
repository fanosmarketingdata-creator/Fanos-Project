import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getMaintenance, isLocked } from '@/lib/maintenance';

// Middleware ini menggantikan SELURUH sistem session/redirect manual yang
// dulu (processLogin/validateSession/logout custom + trik window.top
// navigation yang rapuh di iframe Apps Script). Supabase Auth menyimpan
// session lewat cookie httpOnly yang dikelola browser secara native —
// tidak ada lagi masalah "navigasi diblokir karena bukan interaksi user
// asli", karena middleware ini jalan di SERVER pada setiap request,
// bukan di client via setTimeout/setInterval.
export async function middleware(request: NextRequest) {
  // Pathname diteruskan ke Server Component (layout) untuk pemeriksaan hak akses menu.
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-pathname', request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers: reqHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: reqHeaders } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: reqHeaders } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Ini juga otomatis me-refresh session (auto sliding expiration) tiap
  // request — padanan dari "heartbeat" di sistem lama, tapi bawaan
  // Supabase, tidak perlu setInterval custom lagi.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login');

  // Mode maintenance: semua pengguna selain Superuser melihat halaman pemberitahuan (HTTP 503).
  const maint = await getMaintenance(supabase);
  if (path.startsWith('/maintenance')) {
    if (!isLocked(maint)) { const u = request.nextUrl.clone(); u.pathname = '/dashboard'; return NextResponse.redirect(u); }
    return response;
  }
  if (isLocked(maint) && !(isAuthPage && !user)) {
    let isSuper = false;
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      isSuper = prof?.role === 'Superuser';
    }
    if (!isSuper && user) {
      if (path.startsWith('/api/')) return NextResponse.json({ error: 'Sistem sedang dalam perbaikan (maintenance).' }, { status: 503 });
      const u = request.nextUrl.clone(); u.pathname = '/maintenance';
      return NextResponse.rewrite(u, { status: 503, request: { headers: reqHeaders } });
    }
  }

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|api/push/announce|api/maintenance/tick|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
