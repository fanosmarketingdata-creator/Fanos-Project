-- Lighting Specification: item diambil dari BOQ (akumulasi per SKU), kode gambar diisi manual.
create table if not exists public.lighting_specifications (
  id uuid primary key default gen_random_uuid(),
  boq_project_id uuid not null unique references public.boq_projects(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lighting_specification_items (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references public.lighting_specifications(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text not null,
  uom text,
  qty numeric(14,2) not null default 0,   -- qty BOQ saat terakhir disinkronkan
  drawing_code text,
  sort_order int not null default 0
);
create index if not exists lighting_spec_items_spec_idx on public.lighting_specification_items(spec_id);

do $$
declare t text;
begin
  foreach t in array array['lighting_specifications', 'lighting_specification_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_all_%1$s" on public.%1$I', t);
    execute format('create policy "authenticated_all_%1$s" on public.%1$I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
