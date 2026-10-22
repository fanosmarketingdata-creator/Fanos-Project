alter table public.clients add column if not exists status text not null default 'Unverified';
alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients add constraint clients_status_check check (status in ('Active','Inactive','Blacklist','Unverified'));
