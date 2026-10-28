-- 0030: Project Hub > Project Management (proyek, task kanban, subtask, diskusi, file, aktivitas).
create table if not exists public.pm_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'In Progress' check (status in ('Planning','In Progress','Completed','On Hold')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  start_date date,
  end_date date,
  owner_id uuid references public.team_members(id) on delete set null,
  master_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pm_project_members (
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  primary key (project_id, team_member_id)
);

create table if not exists public.pm_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'To-Do' check (status in ('To-Do','In Progress','Review','Completed')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  start_date date,
  due_date date,
  depends_on uuid references public.pm_tasks(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pm_task_assignees (
  task_id uuid not null references public.pm_tasks(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  primary key (task_id, team_member_id)
);

create table if not exists public.pm_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.pm_tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Diskusi project (task_id null) dan komentar task.
create table if not exists public.pm_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  task_id uuid references public.pm_tasks(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- File berupa tautan (nama + URL).
create table if not exists public.pm_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  task_id uuid references public.pm_tasks(id) on delete cascade,
  name text not null,
  url text not null,
  created_by text,
  created_at timestamptz not null default now()
);

-- Log aktivitas: sumber tab Notifications (project) dan Activities (task).
create table if not exists public.pm_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pm_projects(id) on delete cascade,
  task_id uuid references public.pm_tasks(id) on delete cascade,
  actor_name text,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists pm_tasks_project_idx on public.pm_tasks(project_id);
create index if not exists pm_comments_project_idx on public.pm_comments(project_id);
create index if not exists pm_activity_project_idx on public.pm_activity(project_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['pm_projects','pm_project_members','pm_tasks','pm_task_assignees','pm_subtasks','pm_comments','pm_files','pm_activity'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_all_%1$s" on public.%1$I', t);
    execute format('create policy "authenticated_all_%1$s" on public.%1$I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;
