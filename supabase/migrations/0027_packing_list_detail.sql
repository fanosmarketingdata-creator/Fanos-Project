-- Packing List standar bisnis: jenis kemasan, jumlah kemasan, unit per kemasan, NW, GW, dimensi, CBM.
alter table public.packing_list_items
  add column if not exists package_type text not null default 'Carton',
  add column if not exists units_per_package numeric(14,2) not null default 0,
  add column if not exists net_weight numeric(12,2) not null default 0,
  add column if not exists gross_weight numeric(12,2) not null default 0,
  add column if not exists length_cm numeric(10,2) not null default 0,
  add column if not exists width_cm numeric(10,2) not null default 0,
  add column if not exists height_cm numeric(10,2) not null default 0,
  add column if not exists cbm numeric(12,4) not null default 0;

-- Data lama: 'colli' = jumlah kemasan, 'weight' = berat kotor.
update public.packing_list_items
   set gross_weight = weight,
       units_per_package = case when colli > 0 then round(qty / colli, 2) else qty end
 where gross_weight = 0 and units_per_package = 0;
