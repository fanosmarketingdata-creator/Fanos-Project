-- ============================================================
-- FASE 7 — Superuser: Role Group, Team Member, Master Akun
-- ============================================================

-- ------------------------------------------------------------
-- ROLE GROUP (label saja dulu; permission per-halaman menyusul)
-- profiles.role tetap menyimpan NAMA role (text) supaya kode yang sudah
-- ada (cek role === 'Superuser') tidak perlu diubah.
-- ------------------------------------------------------------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

insert into public.roles (name, description)
values ('Superuser', 'Akses penuh ke seluruh sistem')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- TEAM MEMBER (master data orang; 1 member bisa punya max 1 akun login)
-- ------------------------------------------------------------
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role_title text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists team_member_id uuid unique references public.team_members(id) on delete set null;

-- Reminders.created_by sebelumnya tidak punya aturan on delete, jadi
-- menghapus akun yang pernah membuat reminder akan gagal. Ubah jadi set null.
alter table public.reminders drop constraint if exists reminders_created_by_fkey;
alter table public.reminders
  add constraint reminders_created_by_fkey foreign key (created_by)
  references public.profiles(id) on delete set null;

-- ------------------------------------------------------------
-- Helper: apakah user yang sedang login adalah Superuser aktif?
-- security definer supaya bisa membaca profiles tanpa kena RLS sendiri.
-- ------------------------------------------------------------
create or replace function public.is_superuser()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Superuser' and status = 'Active'
  );
$$;

-- ------------------------------------------------------------
-- RLS: roles, team_members, profiles
-- Semua user login boleh MEMBACA; hanya Superuser yang boleh menulis.
-- ------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.team_members enable row level security;

create policy "roles_select" on public.roles for select using (auth.role() = 'authenticated');
create policy "roles_write" on public.roles for all using (public.is_superuser()) with check (public.is_superuser());

create policy "team_members_select" on public.team_members for select using (auth.role() = 'authenticated');
create policy "team_members_write" on public.team_members for all using (public.is_superuser()) with check (public.is_superuser());

-- profiles: ganti policy longgar dari 0002 (yang mengizinkan SEMUA user
-- login mengubah SEMUA baris, termasuk role-nya sendiri) dengan yang ketat.
drop policy if exists "authenticated_all_profiles" on public.profiles;

create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on public.profiles for insert with check (public.is_superuser());
create policy "profiles_update" on public.profiles for update
  using (public.is_superuser() or id = auth.uid())
  with check (public.is_superuser() or id = auth.uid());
create policy "profiles_delete" on public.profiles for delete using (public.is_superuser());

-- Cegah user biasa menaikkan role/status/team_member miliknya sendiri
-- (policy di atas mengizinkan user mengubah barisnya sendiri, mis. foto
-- profil — kolom sensitif dijaga lewat trigger ini).
-- auth.uid() null = akses langsung dari SQL Editor / service role key
-- (tanpa JWT user), jadi tetap diizinkan.
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_superuser() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.team_member_id is distinct from old.team_member_id then
      raise exception 'Hanya Superuser yang boleh mengubah role, status, atau team member';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_profile_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ------------------------------------------------------------
-- STORAGE: foto profil
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "authenticated_upload_profile_photos"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

create policy "authenticated_update_profile_photos"
  on storage.objects for update
  using (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

create policy "authenticated_delete_profile_photos"
  on storage.objects for delete
  using (bucket_id = 'profile-photos' and auth.role() = 'authenticated');

create policy "public_read_profile_photos"
  on storage.objects for select
  using (bucket_id = 'profile-photos');
