-- Template Syarat & Ketentuan untuk cetak Quotation (menu Finance > Terms Template).
-- content = HTML teks kaya berawalan <!--rt--> (editor ala Word: bullet, nomor, indent).
create table if not exists public.quotation_terms_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  lang text not null default 'id' check (lang in ('id', 'en')),
  content text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quotation_terms_templates enable row level security;
drop policy if exists "authenticated_all_quotation_terms_templates" on public.quotation_terms_templates;
create policy "authenticated_all_quotation_terms_templates" on public.quotation_terms_templates
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Maksimal satu template bawaan.
create unique index if not exists quotation_terms_templates_one_default
  on public.quotation_terms_templates (is_default) where is_default;

notify pgrst, 'reload schema';
