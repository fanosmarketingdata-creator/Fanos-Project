-- Client Category: daftar kategori client (menu Master Data > Clients > Client Category)
-- dan kolom kategori pada tabel clients.
create table if not exists public.client_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.client_categories enable row level security;
drop policy if exists "authenticated_all_client_categories" on public.client_categories;
create policy "authenticated_all_client_categories" on public.client_categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table public.clients add column if not exists category text;

notify pgrst, 'reload schema';
