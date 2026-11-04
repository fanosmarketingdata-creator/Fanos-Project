-- Product Catalogue: warna reflector, warna badan lampu, dimensi, cut out, dan ampere.
alter table public.products add column if not exists reflector_color text;
alter table public.products add column if not exists body_color text;
alter table public.products add column if not exists dimension text;
alter table public.products add column if not exists cut_out text;
alter table public.products add column if not exists ampere text;

notify pgrst, 'reload schema';
