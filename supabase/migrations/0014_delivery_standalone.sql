-- Delivery Order bisa dibuat langsung (tanpa Sales Order), seperti di Accurate.
alter table public.delivery_orders alter column sales_order_id drop not null;
alter table public.delivery_orders add column if not exists client_id uuid references public.clients(id);

alter table public.delivery_order_items alter column sales_order_item_id drop not null;
alter table public.delivery_order_items add column if not exists product_id uuid references public.products(id);

-- DO yang sudah ada: isi client dari Sales Order-nya.
update public.delivery_orders d set client_id = s.client_id
from public.sales_orders s where d.sales_order_id = s.id and d.client_id is null;

-- Item DO yang sudah ada: isi produk dari item Sales Order-nya (supaya nama produk tampil).
update public.delivery_order_items i set product_id = soi.product_id
from public.sales_order_items soi where i.sales_order_item_id = soi.id and i.product_id is null;
