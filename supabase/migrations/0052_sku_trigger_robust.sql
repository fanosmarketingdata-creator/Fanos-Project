-- assign_sku: abaikan nomor urut yang terlalu panjang (> 9 digit) agar tidak error
-- "value ... is out of range for type integer" saat menyimpan produk baru.
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

  select coalesce(max(substring(sku from '-(\d{1,9})$')::int), 0) + 1 into nxt from public.products;
  new.sku := v_code || '-' || lpad(nxt::text, 5, '0');
  return new;
end $$;

notify pgrst, 'reload schema';
