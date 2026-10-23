-- Return: Order (retur barang -> stok), Invoice (retur keuangan -> Credit Note), Credit Note.

-- 1) Jenis retur + kondisi barang + hubungan Return Invoice -> Return Order
alter table public.sales_returns add column if not exists kind text not null default 'INVOICE';
alter table public.sales_returns drop constraint if exists sales_returns_kind_check;
alter table public.sales_returns add constraint sales_returns_kind_check check (kind in ('ORDER','INVOICE'));
alter table public.sales_returns add column if not exists return_order_id uuid references public.sales_returns(id);
alter table public.sales_returns add column if not exists restock boolean not null default false;
alter table public.sales_returns add column if not exists settlement text; -- 'CREDIT' | 'REFUND'
alter table public.sales_return_items add column if not exists condition text not null default 'Baik';
-- Retur lama = retur yang sekaligus menerbitkan Credit Note (jenis INVOICE).

-- 2) Credit Note: sumber invoice, pemakaian, refund
alter table public.credit_notes add column if not exists invoice_id uuid references public.invoices(id);
alter table public.credit_notes add column if not exists applied_amount numeric(14,2) not null default 0;
alter table public.credit_notes add column if not exists refunded_amount numeric(14,2) not null default 0;
alter table public.credit_notes add column if not exists notes text;

create table if not exists public.credit_note_applications (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references public.credit_notes(id) on delete cascade,
  invoice_id uuid references public.invoices(id),   -- diisi untuk APPLY
  kind text not null check (kind in ('APPLY','REFUND')),
  amount numeric(14,2) not null default 0,
  app_date date not null default current_date,
  method text,
  reference_no text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.credit_note_applications enable row level security;
drop policy if exists "authenticated_all_cn_applications" on public.credit_note_applications;
create policy "authenticated_all_cn_applications" on public.credit_note_applications
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table public.invoices add column if not exists credit_applied numeric(14,2) not null default 0;

-- Data lama: Credit Note lama sudah memotong sisa invoice. Pindahkan ke catatan pemakaian.
with cn as (
  select c.id, r.invoice_id, c.amount,
         greatest(0, i.grand_total - i.total_paid - i.remaining) as a,
         coalesce(sum(c.amount) over (partition by r.invoice_id order by c.created_at
           rows between unbounded preceding and 1 preceding), 0) as prev
  from public.credit_notes c
  join public.sales_returns r on r.id = c.sales_return_id
  join public.invoices i on i.id = r.invoice_id
  where c.invoice_id is null
)
update public.credit_notes c
set invoice_id = cn.invoice_id,
    applied_amount = greatest(0, least(cn.amount, cn.a - cn.prev))
from cn where c.id = cn.id;

insert into public.credit_note_applications (credit_note_id, invoice_id, kind, amount, app_date)
select c.id, c.invoice_id, 'APPLY', c.applied_amount, c.cn_date
from public.credit_notes c
where c.applied_amount > 0
  and not exists (select 1 from public.credit_note_applications a where a.credit_note_id = c.id);

update public.invoices i
set credit_applied = coalesce((select sum(a.amount) from public.credit_note_applications a where a.invoice_id = i.id and a.kind = 'APPLY'), 0);

-- 3) Penomoran: Return Order = RO, Return Invoice = RI (retur lama tetap RT)
create or replace function public.assign_return_doc_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nxt int;
  prefix text := case when new.kind = 'ORDER' then 'RO' else 'RI' end;
begin
  if new.doc_no is not null and new.doc_no <> '' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('doc_no_sales_returns'));
  select coalesce(max(case when split_part(doc_no, '-', 3) ~ '^[0-9]+$' then split_part(doc_no, '-', 3)::int end), 0) + 1
    into nxt from public.sales_returns where doc_no is not null;
  new.doc_no := prefix || '-' || to_char(coalesce(new.return_date, current_date), 'YYYYMMDD') || '-' || lpad(nxt::text, 4, '0');
  return new;
end;
$$;
drop trigger if exists trg_sales_returns_doc_no on public.sales_returns;
create trigger trg_sales_returns_doc_no before insert on public.sales_returns
  for each row execute function public.assign_return_doc_no();

-- 4) Buku stok (stock ledger): qty bertanda (+ masuk, - keluar)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  move_date date not null default current_date,
  product_id uuid references public.products(id),
  sku text not null,
  qty numeric(14,2) not null,
  ref_type text not null,        -- mis. 'SALES_RETURN'
  ref_id uuid,
  ref_no text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.stock_movements enable row level security;
drop policy if exists "authenticated_all_stock_movements" on public.stock_movements;
create policy "authenticated_all_stock_movements" on public.stock_movements
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create index if not exists stock_movements_ref_idx on public.stock_movements (ref_type, ref_id);

-- 5) Hak akses menu baru: role yang boleh membuka Sales Return lama
update public.roles
set permissions = permissions || array['/dashboard/returns/order', '/dashboard/returns/invoice']
where '/dashboard/returns' = any(permissions)
  and not ('/dashboard/returns/order' = any(permissions));
