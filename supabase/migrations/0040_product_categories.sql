-- Main Category produk (+ daftar Subcategory-nya) menjadi data yang bisa dikelola dari menu Products > Category.
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subcategories text[] not null default '{}',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.product_categories enable row level security;
drop policy if exists "authenticated_all_product_categories" on public.product_categories;
create policy "authenticated_all_product_categories" on public.product_categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Isi awal: kategori bawaan sistem
insert into public.product_categories (name, subcategories, sort) values
  ('Indoor', array['Downlight','Spotlight','Track Light','Panel Light','Linear Light','LED Strip','Bulb / Lamp','Tube'], 1),
  ('Outdoor', array['Floodlight','Bollard','Wall Light Outdoor','Street Light','Inground','Underwater','Garden Light'], 2),
  ('Decorative', array['Pendant','Chandelier','Wall Lamp','Table Lamp','Floor Lamp'], 3),
  ('Control & Driver', array['Driver','Controller','Sensor','Dimmer'], 4),
  ('Accessories', array['Profile','Cable','Connector','Mounting'], 5)
on conflict (name) do nothing;

-- Kategori yang sudah dipakai produk tetapi belum ada di daftar (data lama) ikut didaftarkan.
insert into public.product_categories (name, subcategories, sort)
select p.category, coalesce(array_agg(distinct p.subcategory) filter (where coalesce(p.subcategory,'') <> ''), '{}'), 100
from public.products p
where coalesce(p.category,'') <> ''
group by p.category
on conflict (name) do nothing;

notify pgrst, 'reload schema';
