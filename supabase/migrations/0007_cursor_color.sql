-- ============================================================
-- Warna Figma Cursor per akun. Hanya Superuser yang dapat mengubahnya
-- (lewat Master Akun); pengguna biasa tidak dapat mengubah warna sendiri.
-- Aman dijalankan ulang.
-- ============================================================
alter table public.profiles add column if not exists cursor_color text not null default '#5B9BF6';

alter table public.profiles drop constraint if exists profiles_cursor_color_hex;
alter table public.profiles add constraint profiles_cursor_color_hex check (cursor_color ~ '^#[0-9A-Fa-f]{6}$');

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
       or new.team_member_id is distinct from old.team_member_id
       or new.cursor_color is distinct from old.cursor_color then
      raise exception 'Hanya Superuser yang boleh mengubah role, status, team member, atau warna kursor';
    end if;
  end if;
  return new;
end;
$$;
