-- Data pengemasan per produk (dipakai otomatis di Packing List).
alter table public.products
  add column if not exists package_type text not null default 'Carton',
  add column if not exists units_per_package numeric(14,2) not null default 0,   -- isi unit per kemasan
  add column if not exists net_weight numeric(12,3) not null default 0,          -- berat bersih per unit (kg)
  add column if not exists gross_weight numeric(12,3) not null default 0,        -- berat kotor per kemasan (kg)
  add column if not exists pkg_length_cm numeric(10,2) not null default 0,       -- dimensi per kemasan
  add column if not exists pkg_width_cm numeric(10,2) not null default 0,
  add column if not exists pkg_height_cm numeric(10,2) not null default 0;
