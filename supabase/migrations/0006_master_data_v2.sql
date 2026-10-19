-- ============================================================
-- MASTER DATA v2 — mengikuti spesifikasi field M_CLIENT, M_VENDOR,
-- M_PRODUCT dan M_PROJECT (tipe input: AUTOGENERATE / MANUAL /
-- PRE-DETERMINED / LOOKUP / HIDDEN).
-- Aman dijalankan ulang (idempotent).
-- ============================================================

-- ------------------------------------------------------------
-- Generator kode otomatis: PREFIX-0001, PREFIX-0002, ...
-- Dipakai Client No, Vendor ID, Project No. Nomor urut berjalan per tabel.
-- ------------------------------------------------------------
create or replace function public.assign_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix text := tg_argv[0];
  col text := tg_argv[1];
  width int := coalesce(tg_argv[2]::int, 4);
  cur text;
  nxt int;
begin
  cur := to_jsonb(new) ->> col;
  if cur is not null and cur <> '' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('code_' || tg_table_name || '_' || col));

  execute format(
    'select coalesce(max(substring(%1$I from ''^'' || %2$L || ''-(\d+)$'')::int), 0) + 1 from public.%3$I',
    col, prefix, tg_table_name
  ) into nxt;

  new := jsonb_populate_record(new, jsonb_build_object(col, prefix || '-' || lpad(nxt::text, width, '0')));
  return new;
end;
$$;

-- ------------------------------------------------------------
-- CLIENTS  (Client No, Company Name, Contact Person, Position,
--           Phone, Email, Company Address, Credit Limit)
-- ------------------------------------------------------------
alter table public.clients add column if not exists client_no text unique;
alter table public.clients add column if not exists position text;
alter table public.clients add column if not exists credit_limit numeric(16,2);

-- Project Name tidak lagi bagian dari Client (pindah ke M_PROJECT).
-- Kolom dipertahankan sebagai alias nama perusahaan supaya dropdown
-- Client di BOQ / Quotation / Sales Order tetap berjalan.
alter table public.clients alter column project_name drop not null;
update public.clients set company = project_name where company is null or company = '';

create or replace function public.sync_client_name()
returns trigger language plpgsql as $$
begin
  new.project_name := new.company;
  return new;
end $$;

drop trigger if exists trg_clients_sync_name on public.clients;
create trigger trg_clients_sync_name before insert or update on public.clients
  for each row execute function public.sync_client_name();

-- isi Client No untuk data lama (urut waktu dibuat)
with n as (
  select id, row_number() over (order by created_at) as rn from public.clients where client_no is null
),
base as (select coalesce(max(substring(client_no from '^CL-(\d+)$')::int), 0) as m from public.clients)
update public.clients c
set client_no = 'CL-' || lpad((base.m + n.rn)::text, 4, '0')
from n, base where c.id = n.id;

drop trigger if exists trg_clients_code on public.clients;
create trigger trg_clients_code before insert on public.clients
  for each row execute function public.assign_code('CL', 'client_no', '4');

-- ------------------------------------------------------------
-- VENDORS  (Vendor ID, Company Name, Contact Person, Position,
--           Phone, Email, Company Address, TOP)
-- ------------------------------------------------------------
alter table public.vendors add column if not exists vendor_no text unique;
alter table public.vendors add column if not exists position text;
alter table public.vendors add column if not exists top text;

with n as (
  select id, row_number() over (order by created_at) as rn from public.vendors where vendor_no is null
),
base as (select coalesce(max(substring(vendor_no from '^VD-(\d+)$')::int), 0) as m from public.vendors)
update public.vendors v
set vendor_no = 'VD-' || lpad((base.m + n.rn)::text, 4, '0')
from n, base where v.id = n.id;

drop trigger if exists trg_vendors_code on public.vendors;
create trigger trg_vendors_code before insert on public.vendors
  for each row execute function public.assign_code('VD', 'vendor_no', '4');

-- ------------------------------------------------------------
-- PRODUCTS  (27 field: pricelist + catalogue)
--   category  -> Main Category   | name  -> Product Name
--   image_url -> Image Reference | price -> Standard Selling Price
--   brand     -> HIDDEN (otomatis 'FANOS')
-- ------------------------------------------------------------
alter table public.products add column if not exists subcategory text;
alter table public.products add column if not exists application text;
alter table public.products add column if not exists wattage text;
alter table public.products add column if not exists input_voltage text;
alter table public.products add column if not exists power_factor text;
alter table public.products add column if not exists cct text;
alter table public.products add column if not exists cri text;
alter table public.products add column if not exists beam_angle text;
alter table public.products add column if not exists lumen text;
alter table public.products add column if not exists ip_rating text;
alter table public.products add column if not exists ik_rating text;
alter table public.products add column if not exists dimming text;
alter table public.products add column if not exists driver_type text;
alter table public.products add column if not exists control_protocol text;
alter table public.products add column if not exists installation_type text;
alter table public.products add column if not exists housing_material text;
alter table public.products add column if not exists finish text;
alter table public.products add column if not exists warranty text;
alter table public.products add column if not exists cost_price numeric(14,2) not null default 0;
alter table public.products add column if not exists notes text;

alter table public.products alter column brand set default 'FANOS';

-- SKU No autogenerate: FNS-00001, FNS-00002, ... (hanya jika SKU dikosongkan)
create or replace function public.assign_sku()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare nxt int;
begin
  if new.sku is not null and new.sku <> '' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('sku_products'));
  select coalesce(max(substring(sku from '^FNS-(\d+)$')::int), 0) + 1 into nxt from public.products;
  new.sku := 'FNS-' || lpad(nxt::text, 5, '0');
  return new;
end $$;

alter table public.products alter column sku drop not null;
drop trigger if exists trg_products_sku on public.products;
create trigger trg_products_sku before insert on public.products
  for each row execute function public.assign_sku();

-- ------------------------------------------------------------
-- PROJECTS  (Project No, Name, Location, Classification, Type,
--            Client Company, Client Name, Trigger, Triggered By,
--            Term of Payment, Cashback)
-- ------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_no text unique,
  name text not null,
  location text,
  classification text,
  project_type text,
  client_id uuid references public.clients(id) on delete set null,
  client_company text,          -- LOOKUP: snapshot Company Name client
  client_name text,             -- LOOKUP: snapshot Contact Person client
  trigger_source text,          -- "Trigger" (sumber proyek)
  triggered_by text,
  top text,
  cashback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_projects_code on public.projects;
create trigger trg_projects_code before insert on public.projects
  for each row execute function public.assign_code('PRJ', 'project_no', '4');

alter table public.projects enable row level security;
drop policy if exists "authenticated_all_projects" on public.projects;
create policy "authenticated_all_projects" on public.projects
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
