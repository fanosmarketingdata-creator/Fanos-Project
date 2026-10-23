-- Integrasi stok: gudang pada Delivery Order & Retur, serta Purchase Delivery (Goods Receipt).
alter table public.delivery_orders add column if not exists warehouse_id uuid references public.warehouses(id);
alter table public.sales_returns   add column if not exists warehouse_id uuid references public.warehouses(id);

-- Stock Out Delivery Order memakai gudang yang dipilih di DO (default bila kosong).
create or replace function public.post_delivery_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare d record; wh uuid;
begin
  select id, doc_no, do_date, warehouse_id into d from public.delivery_orders where id = new.delivery_order_id;
  wh := d.warehouse_id;
  if wh is null then
    select id into wh from public.warehouses where is_default and is_active order by created_at limit 1;
  end if;
  insert into public.stock_movements (move_date, product_id, sku, qty, ref_type, ref_id, ref_no, notes, warehouse_id)
  values (coalesce(d.do_date, current_date), new.product_id, new.sku, -new.qty_shipped, 'DELIVERY', new.delivery_order_id, d.doc_no, 'Pengiriman barang (Delivery Order)', wh);
  return new;
end $$;

-- Purchase Delivery (penerimaan barang dari PO) -> Stock In.
create table if not exists public.purchase_deliveries (
  id uuid primary key default gen_random_uuid(),
  doc_no text unique,
  gr_date date not null default current_date,
  purchase_order_id uuid not null references public.purchase_orders(id),
  vendor_id uuid references public.vendors(id),
  warehouse_id uuid not null references public.warehouses(id),
  vendor_do_no text,
  notes text,
  status text not null default 'RECEIVED',
  created_at timestamptz not null default now()
);
create table if not exists public.purchase_delivery_items (
  id uuid primary key default gen_random_uuid(),
  purchase_delivery_id uuid not null references public.purchase_deliveries(id) on delete cascade,
  po_item_id uuid references public.purchase_order_items(id) on delete set null,
  product_id uuid references public.products(id),
  sku text not null,
  qty_received numeric(14,2) not null default 0,
  notes text,
  sort_order int not null default 0
);
create index if not exists idx_pd_po on public.purchase_deliveries(purchase_order_id);
create index if not exists idx_pdi_poitem on public.purchase_delivery_items(po_item_id);

alter table public.purchase_deliveries enable row level security;
alter table public.purchase_delivery_items enable row level security;
drop policy if exists "authenticated_all_purchase_deliveries" on public.purchase_deliveries;
create policy "authenticated_all_purchase_deliveries" on public.purchase_deliveries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_all_purchase_delivery_items" on public.purchase_delivery_items;
create policy "authenticated_all_purchase_delivery_items" on public.purchase_delivery_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists trg_purchase_deliveries_doc_no on public.purchase_deliveries;
create trigger trg_purchase_deliveries_doc_no before insert on public.purchase_deliveries
  for each row execute function public.assign_doc_no('GR', 'gr_date');
