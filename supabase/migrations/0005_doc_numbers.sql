-- ============================================================
-- NOMOR DOKUMEN — format sama seperti sistem lama:
--   INV-20260910-0074  (PREFIX-TANGGAL DOKUMEN-NOMOR URUT)
-- Nomor urut berjalan per tabel (bukan reset tiap hari), seperti
-- PO-20260911-0036 -> PO-20260910-0035 di sistem lama.
-- ============================================================

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
  nxt int;
begin
  if new.doc_no is not null then
    return new;
  end if;

  d := coalesce((to_jsonb(new) ->> dcol)::date, current_date);

  -- kunci per tabel supaya dua insert bersamaan tidak dapat nomor yang sama
  perform pg_advisory_xact_lock(hashtext('doc_no_' || tg_table_name));

  execute format(
    'select coalesce(max(split_part(doc_no, ''-'', 3)::int), 0) + 1 from public.%I where doc_no is not null',
    tg_table_name
  ) into nxt;

  new.doc_no := prefix || '-' || to_char(d, 'YYYYMMDD') || '-' || lpad(nxt::text, 4, '0');
  return new;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('boq_projects',    'BOQ', 'boq_date'),
      ('quotations',      'QT',  'quote_date'),
      ('sales_orders',    'SO',  'so_date'),
      ('delivery_orders', 'DO',  'do_date'),
      ('invoices',        'INV', 'inv_date'),
      ('purchase_orders', 'PO',  'po_date'),
      ('sales_returns',   'RT',  'return_date'),
      ('credit_notes',    'CN',  'cn_date')
    ) as t(tbl, prefix, dcol)
  loop
    execute format('alter table public.%I add column if not exists doc_no text unique', r.tbl);

    -- isi nomor untuk data yang sudah ada (urut berdasarkan waktu dibuat)
    execute format($f$
      with n as (
        select id, row_number() over (order by created_at) as rn
        from public.%1$I where doc_no is null
      )
      update public.%1$I t
      set doc_no = %2$L || '-' || to_char(t.%3$I, 'YYYYMMDD') || '-' || lpad(n.rn::text, 4, '0')
      from n where t.id = n.id
    $f$, r.tbl, r.prefix, r.dcol);

    execute format(
      'create trigger trg_%1$s_doc_no before insert on public.%1$I for each row execute function public.assign_doc_no(%2$L, %3$L)',
      r.tbl, r.prefix, r.dcol
    );
  end loop;
end $$;
