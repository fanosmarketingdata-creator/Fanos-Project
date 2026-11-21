-- Isi project pada Sales Order lama yang dibuat dari Quotation berbasis BOQ.
-- Sebelumnya Sales Order hanya menyalin quotations.project_name (kosong untuk quotation BOQ).
-- Sekarang mengikuti BOQ Project (sama seperti halaman Quotation). Idempotent; hanya mengisi yang masih kosong.
update public.sales_orders so
   set project_name = coalesce(nullif(so.project_name, ''), b.project_name),
       project_id   = coalesce(so.project_id, b.project_id, q.project_id)
  from public.quotations q
  join public.boq_projects b on b.id = q.boq_project_id
 where so.quotation_id = q.id
   and (so.project_name is null or so.project_name = '' or so.project_id is null);
