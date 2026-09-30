-- ============================================================
-- ROW LEVEL SECURITY
-- Aturan dasar: semua tabel bisnis boleh dibaca & ditulis oleh
-- SIAPA SAJA yang sudah login (authenticated) — mencerminkan sistem
-- lama yang tidak membatasi akses data per-role di level backend.
-- Superuser-only (Master Akun, Role Group) dibatasi lewat kolom
-- profiles.role di level aplikasi (Next.js), bukan di RLS, supaya
-- konsisten dengan bagaimana halaman itu sudah di-gate di UI.
-- ============================================================

-- Aktifkan RLS di semua tabel
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Policy generik: authenticated user boleh select/insert/update/delete
-- semua baris di semua tabel bisnis (mengikuti perilaku sistem lama).
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
  loop
    execute format('create policy "authenticated_all_%1$s" on public.%1$I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;
