-- Payment Method (Finance) dapat menyimpan data rekening; dipakai sebagai pilihan rekening di semua dokumen cetak.
alter table public.finance_options add column if not exists bank_name text;
alter table public.finance_options add column if not exists account_no text;
alter table public.finance_options add column if not exists account_holder text;
alter table public.finance_options add column if not exists account_note text;

insert into public.finance_options (kind, name, bank_name, account_no, account_holder) values
  ('payment_method', 'Transfer BCA - PT. Fanosindo Internusa (PPN)', 'BCA KCP Mahkota Ancol', '5295 2288 11', 'PT. Fanosindo Internusa'),
  ('payment_method', 'Transfer BCA - Edward (Non-PPN)', 'BCA KCP Mahkota Ancol', '5295 5699 88', 'Edward')
on conflict (kind, name) do nothing;

notify pgrst, 'reload schema';
