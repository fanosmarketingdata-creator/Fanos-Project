-- Versi bahasa Inggris untuk pop-up pengumuman.
-- title & message  = Bahasa Indonesia (wajib, sudah ada)
-- title_en & message_en = English (opsional). Bila kosong, pop-up hanya tampil dalam
-- Bahasa Indonesia dan tombol pilihan bahasa disembunyikan.

alter table public.system_announcements
  add column if not exists title_en text,
  add column if not exists message_en text;

-- Contoh:
-- insert into public.system_announcements (title, message, title_en, message_en, version_label, ends_at)
-- values (
--   $$Pembaruan Sistem$$,
--   $$Fanos ERP telah diperbarui:
--
-- 1. Perbaikan tampilan cetak invoice
-- 2. Penambahan fitur baru$$,
--   $$System Update$$,
--   $$Fanos ERP has been updated:
--
-- 1. Improved invoice print layout
-- 2. New features added$$,
--   'v1.1',
--   now() + interval '14 days'
-- );
