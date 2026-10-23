-- Collection: Payment (CR) + Outstanding.
-- Payment punya nomor CR (otomatis, boleh diisi manual) dan kolom total discount.
-- Invoice mencatat total diskon pembayaran supaya sisa tagihan (owing) = grand_total - terbayar - diskon.
alter table public.payments add column if not exists doc_no text unique;
alter table public.payments add column if not exists discount numeric(14,2) not null default 0;
alter table public.invoices add column if not exists paid_discount numeric(14,2) not null default 0;

-- Penomoran otomatis dibuat tahan terhadap nomor manual yang formatnya bebas.
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
  if new.doc_no is not null and new.doc_no <> '' then
    return new;
  end if;

  d := coalesce((to_jsonb(new) ->> dcol)::date, current_date);
  perform pg_advisory_xact_lock(hashtext('doc_no_' || tg_table_name));

  execute format(
    'select coalesce(max(case when split_part(doc_no, ''-'', 3) ~ ''^[0-9]+$'' then split_part(doc_no, ''-'', 3)::int end), 0) + 1 from public.%I where doc_no is not null',
    tg_table_name
  ) into nxt;

  new.doc_no := prefix || '-' || to_char(d, 'YYYYMMDD') || '-' || lpad(nxt::text, 4, '0');
  return new;
end;
$$;

-- Nomor untuk payment yang sudah ada.
with n as (
  select id, row_number() over (order by created_at) as rn from public.payments where doc_no is null
)
update public.payments p
set doc_no = 'CR-' || to_char(p.pay_date, 'YYYYMMDD') || '-' || lpad(n.rn::text, 4, '0')
from n where p.id = n.id;

drop trigger if exists trg_payments_doc_no on public.payments;
create trigger trg_payments_doc_no before insert on public.payments
  for each row execute function public.assign_doc_no('CR', 'pay_date');
