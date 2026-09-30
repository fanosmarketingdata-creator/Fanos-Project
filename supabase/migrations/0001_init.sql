-- ============================================================
-- FANOS ERP — Initial Schema
-- Diterjemahkan dari struktur Google Sheets (CONFIG.sheets) di
-- project Apps Script sebelumnya, dinormalisasi jadi tabel relasional.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------
create type doc_status as enum ('DRAFT', 'APPROVED', 'ACCEPTED', 'ORDERED', 'RECEIVED', 'ONGOING', 'COMPLETED', 'CANCELLED');
create type payment_status as enum ('UNPAID', 'PARTIAL', 'PAID');
create type progress_status as enum ('Pending', 'InProgress', 'Completed');

-- ------------------------------------------------------------
-- PROFILES — extends Supabase auth.users (1 auth user = 1 profile).
-- Role Group disederhanakan jadi kolom "role" (text) dulu; kalau nanti
-- perlu permission per-halaman, bisa dipecah ke tabel roles terpisah.
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'Staff', -- 'Superuser', 'Admin', 'Sales', dst (label bebas)
  photo_url text,
  phone text,
  email text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CLIENTS
-- ------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  company text,
  contact_name text,
  phone text,
  email text,
  address text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- VENDORS
-- ------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  brand text,
  uom text not null default 'Pcs',
  price numeric(14,2) not null default 0,
  image_url text,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- BOQ PROJECT (v2) — Area > Sub-area > Item
-- ------------------------------------------------------------
create table public.boq_projects (
  id uuid primary key default gen_random_uuid(),
  boq_date date not null default current_date,
  project_name text not null,
  client_id uuid references public.clients(id),
  status doc_status not null default 'DRAFT',
  progress progress_status not null default 'Pending',
  route_type text not null default 'quotation', -- 'quotation' | 'so' (langsung ke SO tanpa quotation)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boq_project_items (
  id uuid primary key default gen_random_uuid(),
  boq_project_id uuid not null references public.boq_projects(id) on delete cascade,
  area_name text not null,
  sub_area_name text not null,
  product_id uuid references public.products(id),
  sku text not null,
  qty numeric(14,2) not null default 0,
  uom text,
  kode_gambar text,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
-- BOQ AKUMULASI — rekap total qty per SKU dari 1 BOQ Project
-- ------------------------------------------------------------
create table public.boq_akumulasi (
  id uuid primary key default gen_random_uuid(),
  boq_project_id uuid not null references public.boq_projects(id) on delete cascade,
  sku text not null,
  qty numeric(14,2) not null default 0,
  uom text,
  created_at timestamptz not null default now(),
  unique (boq_project_id, sku)
);

-- ------------------------------------------------------------
-- QUOTATIONS
-- ------------------------------------------------------------
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_date date not null default current_date,
  validity_date date,
  boq_project_id uuid references public.boq_projects(id),
  client_id uuid not null references public.clients(id),
  status doc_status not null default 'DRAFT',
  discounts jsonb not null default '[]', -- [{label, percent}]
  charges jsonb not null default '[]',   -- [{label, amount}]
  subtotal numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_id uuid references public.products(id),
  sku text not null,
  description text,
  qty numeric(14,2) not null default 0,
  uom text,
  unit_price numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
-- SALES ORDERS
-- ------------------------------------------------------------
create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  so_date date not null default current_date,
  client_id uuid not null references public.clients(id),
  quotation_id uuid references public.quotations(id),   -- null kalau manual/langsung dari BOQ
  boq_project_id uuid references public.boq_projects(id),
  status doc_status not null default 'DRAFT',
  discount_percent numeric(6,2) not null default 0,
  discounts jsonb not null default '[]',
  charges jsonb not null default '[]',
  total_amount numeric(14,2) not null default 0,
  global_notes text,
  source_type text, -- 'manual' | 'quotation' | 'boq'
  source_ref uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid references public.products(id),
  sku text not null,
  qty numeric(14,2) not null default 0,
  qty_shipped numeric(14,2) not null default 0,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  sort_order int not null default 0
);

-- ------------------------------------------------------------
-- DELIVERY ORDERS (Surat Jalan) — 1 SO bisa dikirim bertahap (multi DO)
-- ------------------------------------------------------------
create table public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  do_date date not null default current_date,
  sales_order_id uuid not null references public.sales_orders(id),
  status text not null default 'SHIPPED',
  notes text,
  created_at timestamptz not null default now()
);

create table public.delivery_order_items (
  id uuid primary key default gen_random_uuid(),
  delivery_order_id uuid not null references public.delivery_orders(id) on delete cascade,
  sales_order_item_id uuid not null references public.sales_order_items(id),
  sku text not null,
  qty_shipped numeric(14,2) not null default 0,
  notes text
);

-- ------------------------------------------------------------
-- SALES INVOICES
-- ------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  inv_date date not null default current_date,
  sales_order_id uuid references public.sales_orders(id),
  client_id uuid not null references public.clients(id),
  status payment_status not null default 'UNPAID',
  discount_percent numeric(6,2) not null default 0,
  discounts jsonb not null default '[]',
  charges jsonb not null default '[]',
  grand_total numeric(14,2) not null default 0,
  total_paid numeric(14,2) not null default 0,
  remaining numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id),
  sku text not null,
  qty numeric(14,2) not null default 0,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0
);

-- ------------------------------------------------------------
-- PAYMENTS — pembayaran termin/cicilan terhadap invoice
-- ------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  pay_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  method text, -- 'Cash', 'Transfer', 'Cek/Giro', dst
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SALES RETURNS & CREDIT NOTES
-- ------------------------------------------------------------
create table public.sales_returns (
  id uuid primary key default gen_random_uuid(),
  return_date date not null default current_date,
  invoice_id uuid not null references public.invoices(id),
  client_id uuid not null references public.clients(id),
  reason text,
  status text not null default 'PENDING',
  credit_note_id uuid,
  created_at timestamptz not null default now()
);

create table public.sales_return_items (
  id uuid primary key default gen_random_uuid(),
  sales_return_id uuid not null references public.sales_returns(id) on delete cascade,
  sku text not null,
  qty_returned numeric(14,2) not null default 0,
  unit_price numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null default 0
);

create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  cn_date date not null default current_date,
  sales_return_id uuid references public.sales_returns(id),
  client_id uuid not null references public.clients(id),
  amount numeric(14,2) not null default 0,
  status text not null default 'ISSUED',
  created_at timestamptz not null default now()
);

alter table public.sales_returns
  add constraint sales_returns_credit_note_fk foreign key (credit_note_id) references public.credit_notes(id);

-- ------------------------------------------------------------
-- PURCHASE ORDERS
-- ------------------------------------------------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_date date not null default current_date,
  vendor_id uuid not null references public.vendors(id),
  status doc_status not null default 'DRAFT', -- DRAFT | ORDERED | RECEIVED
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  sku text not null,
  description text,
  qty numeric(14,2) not null default 0,
  uom text,
  unit_price numeric(14,2) not null default 0,
  subtotal numeric(14,2) not null default 0
);

-- ------------------------------------------------------------
-- DEFECT LIST
-- ------------------------------------------------------------
create table public.defects (
  id uuid primary key default gen_random_uuid(),
  inspection_date date not null default current_date,
  sales_order_id uuid references public.sales_orders(id),
  sku text not null,
  qty numeric(14,2) not null default 0,
  description text,
  status text not null default 'OPEN', -- OPEN | RESOLVED
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- REMINDERS
-- ------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_date date not null,
  notes text,
  is_done boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at auto-touch trigger (dipakai di beberapa tabel utama)
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_clients_touch before update on public.clients for each row execute function public.touch_updated_at();
create trigger trg_products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger trg_boq_projects_touch before update on public.boq_projects for each row execute function public.touch_updated_at();
create trigger trg_quotations_touch before update on public.quotations for each row execute function public.touch_updated_at();
create trigger trg_sales_orders_touch before update on public.sales_orders for each row execute function public.touch_updated_at();
create trigger trg_invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();
create trigger trg_purchase_orders_touch before update on public.purchase_orders for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Auto-create profile row saat user baru register di Supabase Auth
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
