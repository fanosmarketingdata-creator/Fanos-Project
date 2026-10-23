-- Purchase Invoice (tagihan dari vendor) dan Purchase Payment (pembayaran ke vendor).
create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  doc_no text unique,
  inv_date date not null default current_date,
  due_date date,
  purchase_order_id uuid references public.purchase_orders(id),
  vendor_id uuid not null references public.vendors(id),
  vendor_invoice_no text,
  discount_percent numeric(6,2) not null default 0,
  tax_percent numeric(6,2) not null default 0,
  subtotal numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  total_paid numeric(14,2) not null default 0,
  paid_discount numeric(14,2) not null default 0,
  remaining numeric(14,2) not null default 0,
  status text not null default 'UNPAID',   -- UNPAID | PARTIAL | PAID
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  purchase_invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  product_id uuid references public.products(id),
  sku text not null,
  description text,
  qty numeric(14,2) not null default 0,
  uom text,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  sort_order int not null default 0
);
create table if not exists public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  doc_no text unique,
  pay_date date not null default current_date,
  purchase_invoice_id uuid not null references public.purchase_invoices(id),
  amount numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  method text,
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pi_vendor on public.purchase_invoices(vendor_id);
create index if not exists idx_pp_invoice on public.purchase_payments(purchase_invoice_id);

alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;
alter table public.purchase_payments enable row level security;
drop policy if exists "authenticated_all_purchase_invoices" on public.purchase_invoices;
create policy "authenticated_all_purchase_invoices" on public.purchase_invoices for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_all_purchase_invoice_items" on public.purchase_invoice_items;
create policy "authenticated_all_purchase_invoice_items" on public.purchase_invoice_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "authenticated_all_purchase_payments" on public.purchase_payments;
create policy "authenticated_all_purchase_payments" on public.purchase_payments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop trigger if exists trg_purchase_invoices_doc_no on public.purchase_invoices;
create trigger trg_purchase_invoices_doc_no before insert on public.purchase_invoices
  for each row execute function public.assign_doc_no('PI', 'inv_date');
drop trigger if exists trg_purchase_payments_doc_no on public.purchase_payments;
create trigger trg_purchase_payments_doc_no before insert on public.purchase_payments
  for each row execute function public.assign_doc_no('PP', 'pay_date');
