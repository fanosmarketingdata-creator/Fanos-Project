-- Menu Financial diganti Finance (sub menu di Master Data): beri akses menu baru
-- kepada role yang boleh membuka Clients.
update public.roles
set permissions = permissions || array[
  '/dashboard/discounts', '/dashboard/payment-methods', '/dashboard/payment-terms',
  '/dashboard/taxes', '/dashboard/credit-limits'
]
where '/dashboard/clients' = any(permissions)
  and not ('/dashboard/taxes' = any(permissions));
