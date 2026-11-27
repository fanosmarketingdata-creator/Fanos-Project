-- ============================================================
-- 0050 — HAK AKSES TULIS PER ROLE DI DATABASE (RLS)
-- Sebelumnya hampir semua tabel: "login = boleh tulis", sehingga pembatasan
-- role hanya berlaku di tampilan. Sekarang INSERT/UPDATE/DELETE hanya boleh bila
-- role pengguna punya hak Create/Edit/Delete (salah satu) pada salah satu menu
-- yang memang menulis ke tabel itu. SELECT tidak berubah (semua yang login).
-- Superuser selalu boleh. Aman dijalankan ulang.
-- ============================================================

create or replace function public.can_write(menus text[])
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r text;
  p text[];
  a jsonb;
  m text;
  acts jsonb;
begin
  select role into r from public.profiles where id = auth.uid();
  if r is null then return false; end if;
  if r = 'Superuser' then return true; end if;

  select permissions, role_actions into p, a from public.roles where name = r;
  if not found then return true; end if;  -- sama dengan aplikasi: role tanpa data = akses penuh
  p := coalesce(p, '{}');
  -- menu turunan ikut hak menu induknya
  if '/dashboard/clients' = any(p) then p := array_append(p, '/dashboard/client-categories'); end if;
  if '/dashboard/products' = any(p) then p := array_append(p, '/dashboard/product-categories'); end if;

  foreach m in array menus loop
    if m = any(p) then
      acts := coalesce(a, '{}'::jsonb) -> m;
      if acts is null and m = '/dashboard/client-categories' then acts := a -> '/dashboard/clients'; end if;
      if acts is null and m = '/dashboard/product-categories' then acts := a -> '/dashboard/products'; end if;
      if acts is null then return true; end if;               -- data lama tanpa catatan = akses penuh
      if jsonb_typeof(acts) = 'array' and jsonb_array_length(acts) > 0 then return true; end if;
    end if;
  end loop;
  return false;
end;
$$;
grant execute on function public.can_write(text[]) to authenticated;

do $$
declare
  t record;
  pol record;
begin
  for t in select * from (values
    ('packing_list_items', array['/dashboard/packing-list']),
    ('sales_returns', array['/dashboard/returns/order', '/dashboard/returns/invoice']),
    ('sales_return_items', array['/dashboard/returns/order', '/dashboard/returns/invoice']),
    ('boq_project_items', array['/dashboard/boq-project']),
    ('boq_projects', array['/dashboard/boq-project']),
    ('brands', array['/dashboard/brands', '/dashboard/products']),
    ('client_categories', array['/dashboard/client-categories']),
    ('clients', array['/dashboard/client-categories', '/dashboard/clients']),
    ('credit_note_applications', array['/dashboard/credit-notes', '/dashboard/returns/order', '/dashboard/returns/invoice']),
    ('credit_notes', array['/dashboard/credit-notes', '/dashboard/returns/order', '/dashboard/returns/invoice']),
    ('delivery_order_items', array['/dashboard/delivery-orders', '/dashboard/sales-orders']),
    ('delivery_orders', array['/dashboard/delivery-orders', '/dashboard/sales-orders']),
    ('finance_options', array['/dashboard/cashbacks', '/dashboard/credit-limits', '/dashboard/discounts', '/dashboard/payment-methods', '/dashboard/payment-terms', '/dashboard/taxes']),
    ('invoice_items', array['/dashboard/invoices']),
    ('invoices', array['/dashboard/credit-notes', '/dashboard/invoices', '/dashboard/payments', '/dashboard/returns/order', '/dashboard/returns/invoice']),
    ('lighting_specification_items', array['/dashboard/lighting-specification']),
    ('lighting_specifications', array['/dashboard/lighting-specification']),
    ('packing_lists', array['/dashboard/packing-list']),
    ('payments', array['/dashboard/payments']),
    ('pm_activity', array['/dashboard/project-management']),
    ('pm_columns', array['/dashboard/project-management']),
    ('pm_comments', array['/dashboard/project-management']),
    ('pm_files', array['/dashboard/project-management']),
    ('pm_project_members', array['/dashboard/project-management']),
    ('pm_projects', array['/dashboard/project-management']),
    ('pm_subtasks', array['/dashboard/project-management']),
    ('pm_task_assignees', array['/dashboard/project-management']),
    ('pm_tasks', array['/dashboard/project-management']),
    ('product_categories', array['/dashboard/product-categories']),
    ('products', array['/dashboard/brands', '/dashboard/product-categories', '/dashboard/products']),
    ('project_classifications', array['/dashboard/project-classifications']),
    ('projects', array['/dashboard/boq-project', '/dashboard/projects', '/dashboard/quotations', '/dashboard/sales-orders']),
    ('purchase_deliveries', array['/dashboard/purchase-delivery']),
    ('purchase_delivery_items', array['/dashboard/purchase-delivery']),
    ('purchase_invoice_items', array['/dashboard/purchase-invoice']),
    ('purchase_invoices', array['/dashboard/purchase-invoice', '/dashboard/purchase-payment']),
    ('purchase_order_items', array['/dashboard/purchase-orders']),
    ('purchase_orders', array['/dashboard/purchase-delivery', '/dashboard/purchase-orders']),
    ('purchase_payments', array['/dashboard/purchase-payment']),
    ('quotation_items', array['/dashboard/quotations']),
    ('quotation_terms_templates', array['/dashboard/quotation-templates']),
    ('quotations', array['/dashboard/quotations', '/dashboard/sales-orders']),
    ('sales_order_items', array['/dashboard/quotations', '/dashboard/sales-orders']),
    ('sales_orders', array['/dashboard/sales-orders', '/dashboard/quotations']),
    ('stock_adjustment_items', array['/dashboard/stock-adjustment']),
    ('stock_adjustments', array['/dashboard/stock-adjustment']),
    ('stock_movements', array['/dashboard/purchase-delivery', '/dashboard/stock-adjustment', '/dashboard/stock-transfer', '/dashboard/returns/order', '/dashboard/returns/invoice']),
    ('stock_transfer_items', array['/dashboard/stock-transfer']),
    ('stock_transfers', array['/dashboard/stock-transfer']),
    ('vendors', array['/dashboard/vendors']),
    ('warehouses', array['/dashboard/warehouse'])
  ) as x(tbl, menus)
  loop
    if to_regclass('public.' || t.tbl) is null then continue; end if;

    -- hapus kebijakan lama "semua yang login boleh"
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t.tbl
        and (coalesce(qual, '') ilike '%authenticated%' or coalesce(with_check, '') ilike '%authenticated%')
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t.tbl);
    end loop;

    execute format('drop policy if exists %I on public.%I', t.tbl || '_read', t.tbl);
    execute format('create policy %I on public.%I for select using (auth.role() = ''authenticated'')', t.tbl || '_read', t.tbl);

    execute format('drop policy if exists %I on public.%I', t.tbl || '_ins_perm', t.tbl);
    execute format('create policy %I on public.%I for insert with check ((select public.can_write(%L::text[])))', t.tbl || '_ins_perm', t.tbl, t.menus);
    execute format('drop policy if exists %I on public.%I', t.tbl || '_upd_perm', t.tbl);
    execute format('create policy %I on public.%I for update using ((select public.can_write(%L::text[]))) with check ((select public.can_write(%L::text[])))', t.tbl || '_upd_perm', t.tbl, t.menus, t.menus);
    execute format('drop policy if exists %I on public.%I', t.tbl || '_del_perm', t.tbl);
    execute format('create policy %I on public.%I for delete using ((select public.can_write(%L::text[])))', t.tbl || '_del_perm', t.tbl, t.menus);
  end loop;
end $$;