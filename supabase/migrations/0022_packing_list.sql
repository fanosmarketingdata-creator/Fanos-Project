-- Packing List: berdasarkan Sales Order yang sudah VERIFIED.
create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  doc_no text unique,
  pl_date date not null default current_date,
  sales_order_id uuid not null references public.sales_orders(id),
  client_id uuid references public.clients(id),
  ship_to text,
  packed_by text,
  notes text,
  status text not null default 'PACKED',
  created_at timestamptz not null default now()
);

create table if not exists public.packing_list_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid not null references public.packing_lists(id) on delete cascade,
  product_id uuid references public.products(id),
  sku text not null,
  qty numeric(14,2) not null default 0,
  colli numeric(10,2) not null default 0,      -- jumlah koli / box
  weight numeric(12,2) not null default 0,     -- berat total (kg)
  remarks text,
  sort_order int not null default 0
);

alter table public.packing_lists enable row level security;
alter table public.packing_list_items enable row level security;
drop policy if exists "authenticated_all_packing_lists" on public.packing_lists;
create policy "authenticated_all_packing_lists" on public.packing_lists
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_all_packing_list_items" on public.packing_list_items;
create policy "authenticated_all_packing_list_items" on public.packing_list_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists trg_packing_lists_doc_no on public.packing_lists;
create trigger trg_packing_lists_doc_no before insert on public.packing_lists
  for each row execute function public.assign_doc_no('PL', 'pl_date');

-- Hak akses menu baru: role yang boleh membuka Delivery Order.
update public.roles
set permissions = permissions || array['/dashboard/packing-list']
where '/dashboard/delivery-orders' = any(permissions)
  and not ('/dashboard/packing-list' = any(permissions));
