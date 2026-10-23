-- Pengumuman update sistem yang tampil sebagai pop-up di halaman login.
-- Isi, judul, dan masa tampil diatur dari sini (SQL Editor / Table Editor Supabase),
-- tidak ada teks yang ditulis di kode frontend.

create table if not exists public.system_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,                       -- judul pop-up, mis. "Pembaruan Sistem v1.4"
  message text not null,                     -- isi pesan; baris baru (Enter) ikut tampil
  version_label text,                        -- opsional, mis. "v1.4" (tampil sebagai badge)
  is_active boolean not null default true,   -- saklar cepat: false = pop-up langsung mati
  starts_at timestamptz not null default now(), -- mulai tampil
  ends_at timestamptz,                       -- berhenti tampil setelah waktu ini; NULL = tanpa batas
  revision integer not null default 1,       -- naikkan angkanya untuk memunculkan lagi
                                             -- ke user yang sudah mencentang "jangan tampilkan lagi"
  created_at timestamptz not null default now()
);

alter table public.system_announcements enable row level security;

-- Halaman login diakses SEBELUM login (role anon), jadi anon & authenticated
-- boleh MEMBACA, tetapi hanya baris yang aktif dan masih dalam masa tampil.
drop policy if exists "authenticated_all_system_announcements" on public.system_announcements;
drop policy if exists "public_read_active_announcements" on public.system_announcements;
create policy "public_read_active_announcements" on public.system_announcements
  for select to anon, authenticated
  using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

-- Tidak ada policy insert/update/delete: perubahan hanya lewat dashboard Supabase
-- (service role) atau SQL Editor.

-- Contoh data. Pakai tanda $$ ... $$ supaya teks bisa di-copy paste APA ADANYA:
-- tidak perlu menulis \n, tidak perlu E'...', dan tanda kutip (') tidak perlu digandakan.
-- insert into public.system_announcements (title, message, version_label, ends_at)
-- values (
--   $$Pembaruan Sistem$$,
--   $$Fanos ERP telah diperbarui:
--
-- 1. Perbaikan tampilan cetak invoice
-- 2. Penambahan fitur baru
--
-- Terima kasih.$$,
--   'v1.1',
--   now() + interval '14 days'
-- );
