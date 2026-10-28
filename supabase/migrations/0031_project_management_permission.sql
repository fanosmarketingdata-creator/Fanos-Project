-- 0031: beri akses menu Project Hub > Project Management ke role yang sudah punya Project RFQ.
-- (Hak akses disimpan per role; menu baru tidak otomatis muncul untuk role yang sudah ada.)
update public.roles
set permissions = permissions || array['/dashboard/project-management']
where name <> 'Superuser'
  and '/dashboard/project-rfq' = any(permissions)
  and not ('/dashboard/project-management' = any(permissions));
