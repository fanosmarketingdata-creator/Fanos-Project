-- Nomor dokumen tidak boleh dipakai ulang setelah dokumen terakhir dihapus.
-- Sebelumnya: max(nomor)+1 dari tabel -> bila dokumen terbaru dihapus, nomornya muncul lagi.
-- Sekarang: counter permanen per tabel; nomor berikutnya = max(counter, nomor terbesar yang ada) + 1.
create table if not exists public.doc_counters (
  table_name text primary key,
  last_no int not null default 0
);
alter table public.doc_counters enable row level security;  -- tanpa policy: hanya fungsi SECURITY DEFINER yang menyentuhnya

create or replace function public.assign_doc_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix text := tg_argv[0];
  dcol text := tg_argv[1];
  d date;
  mx int;
  nxt int;
begin
  if new.doc_no is not null and new.doc_no <> '' then
    return new;
  end if;

  d := coalesce((to_jsonb(new) ->> dcol)::date, current_date);
  perform pg_advisory_xact_lock(hashtext('doc_no_' || tg_table_name));

  execute format(
    'select coalesce(max(case when split_part(doc_no, ''-'', 3) ~ ''^[0-9]+$'' then split_part(doc_no, ''-'', 3)::int end), 0) from public.%I where doc_no is not null',
    tg_table_name
  ) into mx;

  insert into public.doc_counters(table_name, last_no) values (tg_table_name, mx + 1)
  on conflict (table_name) do update set last_no = greatest(public.doc_counters.last_no, mx) + 1
  returning last_no into nxt;

  new.doc_no := prefix || '-' || to_char(d, 'YYYYMMDD') || '-' || lpad(nxt::text, 4, '0');
  return new;
end;
$$;
