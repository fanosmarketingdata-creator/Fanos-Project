-- Sales Order manual: simpan Nama Project (dan tautannya ke Master Project).
-- Idempotent: aman dijalankan ulang.
alter table public.sales_orders add column if not exists project_name text;
alter table public.sales_orders add column if not exists project_id uuid references public.projects(id) on delete set null;

-- Sales Order yang dibuat dari Quotation mengikuti project pada Quotation-nya.
update public.sales_orders so
   set project_name = q.project_name,
       project_id   = q.project_id
  from public.quotations q
 where so.quotation_id = q.id
   and so.project_name is null
   and q.project_name is not null;
