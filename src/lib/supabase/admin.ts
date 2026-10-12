import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Client dengan service-role key: MELEWATI semua RLS dan boleh mengelola
// akun login (Supabase Auth Admin API). Hanya boleh dipanggil dari server
// (Server Actions / Route Handlers) SETELAH memastikan pemanggilnya
// Superuser. Import 'server-only' di atas membuat build gagal kalau file
// ini tidak sengaja ikut ter-import ke Client Component, jadi key-nya tidak
// mungkin bocor ke browser.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diset di environment');

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
