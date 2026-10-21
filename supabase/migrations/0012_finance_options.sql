-- Master Finance: satu tabel untuk Discount, Tax, Cashback, Payment Method, Payment Term, Credit Limit.
create table if not exists public.finance_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('discount','tax','cashback','payment_method','payment_term','credit_limit')),
  name text not null,
  value numeric,           -- persen (discount/tax/cashback) atau nominal Rp (credit_limit)
  created_at timestamptz not null default now(),
  unique (kind, name)
);

alter table public.finance_options enable row level security;
drop policy if exists "authenticated_all_finance_options" on public.finance_options;
create policy "authenticated_all_finance_options" on public.finance_options
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.finance_options (kind, name, value) values
  ('payment_term','Cash',null),
  ('payment_term','COD',null),
  ('payment_term','DP 50% - Pelunasan 50%',null),
  ('payment_term','DP 30% - Pelunasan 70%',null),
  ('payment_term','Net 7 Hari',null),
  ('payment_term','Net 14 Hari',null),
  ('payment_term','Net 30 Hari',null),
  ('payment_term','Net 45 Hari',null),
  ('payment_term','Net 60 Hari',null),
  ('payment_method','Transfer Bank',null),
  ('payment_method','Tunai',null),
  ('tax','PPN 11%',11),
  ('credit_limit','Tanpa Kredit (Cash)',0),
  ('credit_limit','Rp 10.000.000',10000000),
  ('credit_limit','Rp 25.000.000',25000000),
  ('credit_limit','Rp 50.000.000',50000000),
  ('credit_limit','Rp 100.000.000',100000000),
  ('credit_limit','Rp 250.000.000',250000000),
  ('credit_limit','Rp 500.000.000',500000000),
  ('credit_limit','Rp 1.000.000.000',1000000000)
on conflict (kind, name) do nothing;

-- Nilai Term of Payment & Cashback yang sudah terisi di Project ikut masuk ke daftar.
insert into public.finance_options (kind, name)
select distinct 'payment_term', top from public.projects where top is not null and top <> ''
on conflict (kind, name) do nothing;
insert into public.finance_options (kind, name, value)
select distinct 'cashback', cashback, null::numeric from public.projects where cashback is not null and cashback <> ''
on conflict (kind, name) do nothing;

-- Credit limit client yang nominalnya belum ada di daftar.
insert into public.finance_options (kind, name, value)
select distinct 'credit_limit', 'Rp ' || replace(to_char(credit_limit, 'FM999,999,999,999,999'), ',', '.'), credit_limit
from public.clients where credit_limit is not null and credit_limit > 0
on conflict (kind, name) do nothing;

-- Akses menu Cashback untuk role yang sudah boleh membuka Tax.
update public.roles
set permissions = permissions || array['/dashboard/cashbacks']
where '/dashboard/taxes' = any(permissions) and not ('/dashboard/cashbacks' = any(permissions));
