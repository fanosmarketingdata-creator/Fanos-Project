-- 0034: hak akses detail per menu (Create / Edit / Delete) di Role Group.
-- Menu yang belum punya catatan dianggap berhak penuh (perilaku lama tidak berubah).
alter table public.roles add column if not exists role_actions jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';
