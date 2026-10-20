-- Project Classification: daftar nilai untuk dropdown pada Project Master.
create table if not exists public.project_classifications (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.project_classifications enable row level security;
drop policy if exists "authenticated_all_project_classifications" on public.project_classifications;
create policy "authenticated_all_project_classifications" on public.project_classifications
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.project_classifications (name)
values ('Consultant'), ('Supplier'), ('Installation'), ('Mixed')
on conflict (name) do nothing;
