-- Client bisa punya lebih dari satu kontak. Kontak pertama tetap disalin ke
-- kolom lama (contact_name, position, phone, email) agar dokumen cetak tetap jalan.
alter table clients add column if not exists contacts jsonb not null default '[]'::jsonb;

update clients
set contacts = jsonb_build_array(jsonb_build_object(
  'name', coalesce(contact_name, ''), 'position', coalesce(position, ''),
  'phone', coalesce(phone, ''), 'email', coalesce(email, '')))
where contacts = '[]'::jsonb
  and (coalesce(contact_name,'') <> '' or coalesce(phone,'') <> '' or coalesce(email,'') <> '' or coalesce(position,'') <> '');

notify pgrst, 'reload schema';
