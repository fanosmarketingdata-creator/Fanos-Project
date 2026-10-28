-- 0029: nama project pada Quotation manual, sinkron BOQ/Quote ke Master Project, PO ditarik dari SO.
alter table public.quotations add column if not exists project_name text;
alter table public.quotations add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.boq_projects add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.purchase_orders add column if not exists sales_order_id uuid references public.sales_orders(id) on delete set null;

-- Masukkan BOQ Project lama yang belum ada di Master Project.
insert into public.projects (name, client_id, client_company, client_name)
select distinct on (lower(b.project_name)) b.project_name, b.client_id, c.company, c.contact_name
from public.boq_projects b
left join public.clients c on c.id = b.client_id
where coalesce(trim(b.project_name), '') <> ''
  and not exists (select 1 from public.projects p where lower(p.name) = lower(b.project_name))
order by lower(b.project_name), b.created_at;

update public.boq_projects b set project_id = p.id
from public.projects p
where b.project_id is null and lower(p.name) = lower(b.project_name);
