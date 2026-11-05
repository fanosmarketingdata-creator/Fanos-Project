-- Sesuaikan SKU produk yang sudah ada ke format baru: <KODE BRAND>-<nomor>, mis. FNS-00045 -> FAN-00045.
-- Nomor urut dipertahankan (sudah unik), hanya prefix yang berubah sesuai brand.
-- Perlu migrasi 0038 lebih dulu. Salinan SKU di tabel dokumen (quotation, SO, PO, stok, dll.) ikut diperbarui.
-- Aman dijalankan ulang (hanya memproses SKU berformat lama FNS-xxxxx).

do $$
declare
  t record;
  nrows int;
begin
  create temp table _sku_map on commit drop as
  select p.id as product_id, p.sku as old_sku,
         coalesce(b.code, 'FNS') || '-' || lpad(substring(p.sku from '^FNS-(\d+)$'), 5, '0') as new_sku
  from public.products p
  left join public.brands b on lower(b.name) = lower(coalesce(nullif(trim(p.brand), ''), 'FANOS'))
  where p.sku ~ '^FNS-\d+$';

  -- Pastikan tidak ada bentrokan dengan SKU yang sudah ada.
  if exists (select 1 from _sku_map m join public.products p on p.sku = m.new_sku and p.id <> m.product_id) then
    raise exception 'Ada SKU baru yang bentrok dengan SKU yang sudah ada. Periksa tabel products.';
  end if;

  -- Salinan SKU (teks) di semua tabel lain yang punya kolom sku.
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'sku' and c.table_name <> 'products'
  loop
    execute format('update public.%I x set sku = m.new_sku from _sku_map m where x.sku = m.old_sku', t.table_name);
  end loop;

  update public.products p set sku = m.new_sku from _sku_map m where p.id = m.product_id;
  get diagnostics nrows = row_count;
  raise notice 'SKU produk diperbarui: % baris', nrows;
end $$;

notify pgrst, 'reload schema';
