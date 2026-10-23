-- Warehouse, Stock Adjustment, Stock Transfer (2 langkah), Current Stock (view) dan Stock Movement (ledger).

-- 1) Gudang
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null unique,
  address text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.warehouses (code, name, is_default)
select 'WH-001', 'Gudang Utama', true where not exists (select 1 from public.warehouses);

-- 2) Ledger stok: tambah gudang & alasan
alter table public.stock_movements add column if not exists warehouse_id uuid references public.warehouses(id);
alter table public.stock_movements add column if not exists reason text;
update public.stock_movements set warehouse_id = (select id from public.warehouses where is_default order by created_at limit 1) where warehouse_id is null;
create index if not exists stock_movements_wh_sku_idx on public.stock_movements (warehouse_id, sku);

-- 3) Stock on hand per gudang & SKU
create or replace view public.v_current_stock with (security_invoker = true) as
  select warehouse_id, sku, max(product_id::text)::uuid as product_id, sum(qty) as qty
  from public.stock_movements
  group by warehouse_id, sku;

-- 4) Stock Adjustment
create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  doc_no text unique,
  adj_date date not null default current_date,
  warehouse_id uuid not null references public.warehouses(id),
  adj_type text not null check (adj_type in ('IN','OUT','OPNAME')),
  reason text not null,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.stock_adjustment_items (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.stock_adjustments(id) on delete cascade,
  product_id uuid references public.products(id),
  sku text not null,
  qty numeric(14,2) not null default 0,         -- IN/OUT: jumlah; OPNAME: hasil hitung fisik
  system_qty numeric(14,2),                      -- OPNAME: stok sistem saat dihitung
  diff numeric(14,2) not null default 0,         -- efek ke stok (+/-)
  notes text,
  sort_order int not null default 0
);

-- 5) Stock Transfer (Draft -> Shipped -> Completed)
create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  doc_no text unique,
  transfer_date date not null default current_date,
  received_date date,
  from_warehouse_id uuid not null references public.warehouses(id),
  to_warehouse_id uuid not null references public.warehouses(id),
  status text not null default 'DRAFT' check (status in ('DRAFT','SHIPPED','COMPLETED')),
  notes text,
  created_at timestamptz not null default now(),
  check (from_warehouse_id <> to_warehouse_id)
);
create table if not exists public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  product_id uuid references public.products(id),
  sku text not null,
  qty numeric(14,2) not null default 0,
  uom text,
  sort_order int not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['warehouses','stock_adjustments','stock_adjustment_items','stock_transfers','stock_transfer_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_all_%1$s" on public.%1$I', t);
    execute format('create policy "authenticated_all_%1$s" on public.%1$I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;

drop trigger if exists trg_stock_adjustments_doc_no on public.stock_adjustments;
create trigger trg_stock_adjustments_doc_no before insert on public.stock_adjustments
  for each row execute function public.assign_doc_no('ADJ', 'adj_date');
drop trigger if exists trg_stock_transfers_doc_no on public.stock_transfers;
create trigger trg_stock_transfers_doc_no before insert on public.stock_transfers
  for each row execute function public.assign_doc_no('TRF', 'transfer_date');

-- 6) Penjualan -> Stock Out otomatis: setiap item Delivery Order mengurangi stok gudang default.
--    (Stok sebelum fitur ini tidak ikut dihitung; isi saldo awal lewat Stock Adjustment.)
create or replace function public.post_delivery_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare d record; wh uuid;
begin
  select id, doc_no, do_date into d from public.delivery_orders where id = new.delivery_order_id;
  select id into wh from public.warehouses where is_default and is_active order by created_at limit 1;
  insert into public.stock_movements (move_date, product_id, sku, qty, ref_type, ref_id, ref_no, notes, warehouse_id)
  values (coalesce(d.do_date, current_date), new.product_id, new.sku, -new.qty_shipped, 'DELIVERY', new.delivery_order_id, d.doc_no, 'Pengiriman barang (Delivery Order)', wh);
  return new;
end $$;
drop trigger if exists trg_delivery_item_stock on public.delivery_order_items;
create trigger trg_delivery_item_stock after insert on public.delivery_order_items
  for each row execute function public.post_delivery_stock();

-- Hapus Delivery Order (termasuk lewat hapus Sales Order) -> catatan stoknya ikut terhapus.
create or replace function public.unpost_delivery_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.stock_movements where ref_type = 'DELIVERY' and ref_id = old.id;
  return old;
end $$;
drop trigger if exists trg_delivery_unpost_stock on public.delivery_orders;
create trigger trg_delivery_unpost_stock before delete on public.delivery_orders
  for each row execute function public.unpost_delivery_stock();
