-- Mode Maintenance: saklar yang membuat web tidak bisa diakses (kecuali Superuser) saat ada perbaikan.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Semua orang (termasuk yang belum login) boleh MEMBACA status maintenance agar halaman pemberitahuan bisa tampil.
drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings
  for select using (key = 'maintenance');

-- Hanya Superuser yang boleh mengubah.
drop policy if exists "app_settings_superuser_write" on public.app_settings;
create policy "app_settings_superuser_write" on public.app_settings
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Superuser'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Superuser'));

insert into public.app_settings (key, value)
values ('maintenance', '{"on": false, "message": "", "eta": ""}'::jsonb)
on conflict (key) do nothing;

notify pgrst, 'reload schema';
