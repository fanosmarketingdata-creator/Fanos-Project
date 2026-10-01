-- ============================================================
-- STORAGE — bucket untuk foto produk (menggantikan upload ke Google
-- Drive di sistem lama).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Siapa saja yang sudah login boleh upload/update/hapus file di bucket ini.
create policy "authenticated_upload_product_images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "authenticated_update_product_images"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "authenticated_delete_product_images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- File di bucket ini public (bisa dibaca siapa saja lewat URL langsung) —
-- supaya gampang ditampilkan di <img> tanpa perlu signed URL.
create policy "public_read_product_images"
  on storage.objects for select
  using (bucket_id = 'product-images');
