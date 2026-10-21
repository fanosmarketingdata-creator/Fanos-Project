-- Master Brand: daftar nilai untuk kolom Brand pada produk.
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.brands enable row level security;
drop policy if exists "authenticated_all_brands" on public.brands;
create policy "authenticated_all_brands" on public.brands
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into public.brands (name)
select distinct brand from public.products where brand is not null and brand <> ''
on conflict (name) do nothing;
insert into public.brands (name) values ('FANOS') on conflict (name) do nothing;

-- Menu Products kini punya sub menu: role yang sudah boleh membuka Products
-- otomatis diberi akses ke Price List dan Brand.
update public.roles
set permissions = permissions || array['/dashboard/products/price-list', '/dashboard/brands']
where '/dashboard/products' = any(permissions)
  and not ('/dashboard/brands' = any(permissions));
