-- Audit log: setiap tambah / ubah / hapus data bisnis dicatat otomatis oleh trigger database
-- (siapa, kapan, tabel apa, data apa, field apa yang berubah). Hanya Superuser yang boleh membaca audit_logs;
-- semua user melihat notifikasi ringkas lewat activity_feed.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  user_name text,
  user_role text,
  action text not null check (action in ('create', 'update', 'delete')),
  table_name text not null,
  record_id text,
  record_code text,
  record_label text,
  changes jsonb
);
alter table public.audit_logs add column if not exists record_code text; -- ID bisnis: SKU / No. Client / No. Dokumen, dst.
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id);
create index if not exists audit_logs_table_idx on public.audit_logs (table_name);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_superuser_read" on public.audit_logs;
create policy "audit_logs_superuser_read" on public.audit_logs for select using (public.is_superuser());
-- Tidak ada policy insert/update/delete: log hanya bisa ditulis oleh trigger (security definer) dan tidak bisa diubah/dihapus dari aplikasi.

-- Feed aktivitas ringan untuk notifikasi (lonceng + dynamic island) yang dapat dilihat SEMUA user login.
-- Sengaja terpisah dari audit_logs: hanya berisi siapa/apa/kapan, TANPA isi perubahan data.
create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  user_name text,
  action text not null check (action in ('create', 'update', 'delete')),
  table_name text not null,
  record_code text,
  record_label text
);
alter table public.activity_feed add column if not exists record_code text;
create index if not exists activity_feed_created_idx on public.activity_feed (created_at desc);
alter table public.activity_feed enable row level security;
drop policy if exists "activity_feed_read" on public.activity_feed;
create policy "activity_feed_read" on public.activity_feed for select using (auth.role() = 'authenticated');

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pname text;
  prole text;
  r jsonb;
  o jsonb;
  lbl text;
  code text;
  rid text;
  chg jsonb := null;
  k text;
  v jsonb;
begin
  begin
    if uid is not null then
      select full_name, role into pname, prole from public.profiles where id = uid;
    end if;

    if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
    rid := r ->> 'id';
    -- ID bisnis (kode yang dilihat user) dan nama/label data.
    code := coalesce(r ->> 'doc_no', r ->> 'sku', r ->> 'client_no', r ->> 'vendor_no', r ->> 'project_no', r ->> 'code');
    lbl := coalesce(r ->> 'name', r ->> 'company', r ->> 'project_name', r ->> 'title', r ->> 'full_name', r ->> 'email', r ->> 'key', code);

    if tg_op = 'UPDATE' then
      o := to_jsonb(old);
      chg := '{}'::jsonb;
      for k, v in select * from jsonb_each(r) loop
        if k in ('updated_at', 'created_at') then continue; end if;
        if v is distinct from (o -> k) then
          chg := chg || jsonb_build_object(k, jsonb_build_object(
            'old', case when jsonb_typeof(o -> k) = 'string' and length(o ->> k) > 300 then to_jsonb(left(o ->> k, 300) || '…') else o -> k end,
            'new', case when jsonb_typeof(v) = 'string' and length(v #>> '{}') > 300 then to_jsonb(left(v #>> '{}', 300) || '…') else v end));
        end if;
      end loop;
      if chg = '{}'::jsonb then return new; end if; -- tidak ada perubahan nyata
    elsif tg_op = 'DELETE' then
      chg := r;
      for k, v in select * from jsonb_each(r) loop
        if jsonb_typeof(v) = 'string' and length(v #>> '{}') > 300 then
          chg := jsonb_set(chg, array[k], to_jsonb(left(v #>> '{}', 300) || '…'));
        end if;
      end loop;
    end if;

    insert into public.audit_logs (user_id, user_name, user_role, action, table_name, record_id, record_code, record_label, changes)
    values (uid, coalesce(pname, 'System'), prole, case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end,
            tg_table_name, rid, code, lbl, chg);
    -- Aktivitas Superuser tetap masuk audit_logs, tetapi tidak dimunculkan sebagai notifikasi (lonceng / island).
    if uid is null or not coalesce(public.is_superuser(), false) then
      insert into public.activity_feed (user_id, user_name, action, table_name, record_code, record_label)
      values (uid, coalesce(pname, 'System'), case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' else 'delete' end, tg_table_name, code, lbl);
    end if;
    if random() < 0.02 then
      delete from public.activity_feed where created_at < now() - interval '30 days'; -- feed notifikasi hanya menyimpan 30 hari
    end if;
  exception when others then
    null; -- pencatatan audit tidak boleh menggagalkan transaksi bisnis
  end;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Pasang trigger di semua tabel bisnis (kecuali tabel item/anak, log, sistem, dan tabel yang sering berubah otomatis).
do $$
declare t text;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
      and (
        (table_name not in ('audit_logs', 'activity_feed', 'push_subscriptions', 'profiles', 'stock_movements', 'pm_activity', 'system_announcements')
          and table_name not like '%\_items' escape '\'
          and table_name not like 'pm\_%' escape '\')
        or table_name = 'pm_projects'
      )
  loop
    execute format('drop trigger if exists audit_row on public.%I', t);
    execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- Realtime: notifikasi dynamic island untuk semua user (dari activity_feed, bukan audit_logs).
do $$ begin
  alter publication supabase_realtime add table public.activity_feed;
exception when duplicate_object then null; when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
