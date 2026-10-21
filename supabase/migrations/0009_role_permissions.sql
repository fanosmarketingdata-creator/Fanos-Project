-- Hak akses menu per role (diatur Superuser di Role Group).
alter table public.roles add column if not exists permissions text[] not null default '{}';

-- Role yang sudah ada diberi akses ke seluruh menu saat ini agar tidak ada yang terkunci.
update public.roles
set permissions = array[
    '/dashboard/clients',
    '/dashboard/projects',
    '/dashboard/project-classifications',
    '/dashboard/vendors',
    '/dashboard/products',
    '/dashboard/project-rfq',
    '/dashboard/boq-project',
    '/dashboard/lighting-specification',
    '/dashboard/purchase-orders',
    '/dashboard/purchase-delivery',
    '/dashboard/purchase-invoice',
    '/dashboard/purchase-payment',
    '/dashboard/quotations',
    '/dashboard/sales-orders',
    '/dashboard/delivery-orders',
    '/dashboard/invoices',
    '/dashboard/payments',
    '/dashboard/returns',
    '/dashboard/current-stock',
    '/dashboard/stock-adjustment',
    '/dashboard/stock-transfer',
    '/dashboard/stock-movement',
    '/dashboard/warehouse',
    '/dashboard/outstanding',
    '/dashboard/credit-notes',
    '/dashboard/reminders'
  ]
where name <> 'Superuser' and permissions = '{}';
