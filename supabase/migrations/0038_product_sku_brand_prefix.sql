-- SKU produk baru: <3 HURUF DEPAN BRAND>-<nomor urut 5 digit>, mis. FANOS -> FAN-00123.
-- * Kode brand disimpan di brands.code dan UNIK: bila 3 huruf depan sudah dipakai brand lain,
--   dipilih kombinasi huruf lain dari nama brand (mis. "Fantasy" -> FAT, "Fanta" -> FAA ...).
-- * Nomor urut MELANJUTKAN nomor tertinggi yang sudah ada di semua SKU (termasuk FNS-xxxxx lama),
--   sehingga tidak ada nomor yang bentrok.
-- * SKU produk lama TIDAK diubah.

alter table public.brands add column if not exists code text;
create unique index if not exists brands_code_key on public.brands (code) where code is not null;

create or replace function public.make_brand_code(p_name text)
returns text
language plpgsql
as $$
declare
  base text;
  n int;
  i int; j int; k int;
  cand text;
  d int;
begin
  base := upper(regexp_replace(coalesce(p_name, ''), '[^A-Za-z0-9]', '', 'g'));
  while length(base) < 3 loop base := base || 'X'; end loop;
  n := length(base);
  for i in 1..n-2 loop
    for j in i+1..n-1 loop
      for k in j+1..n loop
        cand := substr(base, i, 1) || substr(base, j, 1) || substr(base, k, 1);
        if not exists (select 1 from public.brands where code = cand) then return cand; end if;
      end loop;
    end loop;
  end loop;
  -- cadangan: 2 huruf depan + angka
  for d in 0..9 loop
    cand := substr(base, 1, 2) || d::text;
    if not exists (select 1 from public.brands where code = cand) then return cand; end if;
  end loop;
  return substr(base, 1, 1) || lpad((floor(random() * 99)::int)::text, 2, '0');
end $$;

create or replace function public.assign_brand_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.make_brand_code(new.name);
  end if;
  return new;
end $$;

drop trigger if exists trg_brands_code on public.brands;
create trigger trg_brands_code before insert on public.brands
  for each row execute function public.assign_brand_code();

-- Isi kode untuk brand yang sudah ada (berurutan agar tetap unik).
do $$
declare r record;
begin
  for r in select id, name from public.brands where code is null order by created_at, name loop
    update public.brands set code = public.make_brand_code(r.name) where id = r.id;
  end loop;
end $$;

create or replace function public.assign_sku()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nxt int;
  v_brand text;
  v_code text;
begin
  if new.sku is not null and new.sku <> '' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('sku_products'));

  v_brand := coalesce(nullif(trim(new.brand), ''), 'FANOS');
  select code into v_code from public.brands where lower(name) = lower(v_brand);
  if v_code is null then
    insert into public.brands (name) values (v_brand) on conflict (name) do nothing;
    select code into v_code from public.brands where lower(name) = lower(v_brand);
  end if;
  v_code := coalesce(v_code, 'FNS');

  select coalesce(max(substring(sku from '-(\d+)$')::int), 0) + 1 into nxt from public.products;
  new.sku := v_code || '-' || lpad(nxt::text, 5, '0');
  return new;
end $$;

notify pgrst, 'reload schema';
