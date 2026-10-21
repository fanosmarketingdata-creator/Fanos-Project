-- Price List dibuat manual: produk baru di Catalogue TIDAK otomatis masuk Price List.
alter table public.products add column if not exists price_listed boolean not null default false;

-- Produk yang sudah punya harga sebelumnya dianggap sudah masuk Price List.
update public.products set price_listed = true where coalesce(price, 0) > 0 or coalesce(cost_price, 0) > 0;
