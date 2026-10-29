-- 0032: kolom board per project (bisa ditambah, dihapus, diberi warna).
create table if not exists public.pm_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  is_done boolean not null default false,   -- task di kolom ini dihitung selesai (progress)
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists pm_columns_project_idx on public.pm_columns(project_id, sort_order);

alter table public.pm_tasks add column if not exists column_id uuid references public.pm_columns(id) on delete set null;
alter table public.pm_tasks drop constraint if exists pm_tasks_status_check;

alter table public.pm_columns enable row level security;
drop policy if exists "authenticated_all_pm_columns" on public.pm_columns;
create policy "authenticated_all_pm_columns" on public.pm_columns
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Kolom bawaan untuk project yang sudah ada.
insert into public.pm_columns (project_id, name, color, is_done, sort_order)
select p.id, v.name, v.color, v.done, v.ord
from public.pm_projects p
cross join (values ('To-Do', '#64748b', false, 0), ('In Progress', '#f59e0b', false, 1), ('Review', '#8b5cf6', false, 2), ('Completed', '#10b981', true, 3)) as v(name, color, done, ord)
where not exists (select 1 from public.pm_columns c where c.project_id = p.id);

update public.pm_tasks t set column_id = c.id
from public.pm_columns c
where c.project_id = t.project_id and c.name = t.status and t.column_id is null;
