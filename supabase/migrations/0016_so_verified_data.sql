-- Jalankan SETELAH 0015 (nilai enum baru tidak bisa dipakai di transaksi yang sama).
-- Sales Order lama berstatus ONGOING (sebagian terkirim) dianggap sudah VERIFIED.
update public.sales_orders set status = 'VERIFIED' where status = 'ONGOING';
