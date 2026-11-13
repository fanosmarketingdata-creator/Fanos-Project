-- Bahasa pilihan pengguna per perangkat, agar notifikasi dikirim dalam satu bahasa saja (Indonesia ATAU Inggris).
alter table public.push_subscriptions add column if not exists lang text;
notify pgrst, 'reload schema';
