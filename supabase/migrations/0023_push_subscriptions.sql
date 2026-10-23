-- Notifikasi PC (Web Push) untuk pengumuman sistem baru.
-- Setiap browser user yang mengaktifkan notifikasi tersimpan di sini.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
drop policy if exists "own_push_subscriptions" on public.push_subscriptions;
create policy "own_push_subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Pengiriman notifikasi dipicu oleh Database Webhook (lihat README di pesan update):
--   Supabase > Database > Webhooks > Create:
--     Table: system_announcements, Events: Insert + Update
--     Type: HTTP Request, Method: POST
--     URL: https://<domain-anda>/api/push/announce
--     HTTP Header: x-webhook-secret = <nilai PUSH_WEBHOOK_SECRET>
