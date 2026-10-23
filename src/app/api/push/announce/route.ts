import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ann = { title?: string; message?: string; version_label?: string | null; is_active?: boolean; starts_at?: string; revision?: number };

// Dipanggil oleh Supabase Database Webhook saat baris system_announcements ditambah / revision dinaikkan.
export async function POST(req: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: 'VAPID key belum diset' }, { status: 500 });

  let body: { type?: string; record?: Ann; old_record?: Ann | null };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  const rec = body.record;
  if (!rec || !rec.title) return NextResponse.json({ skipped: 'no record' });
  if (body.type === 'UPDATE' && !((rec.revision ?? 0) > (body.old_record?.revision ?? 0))) return NextResponse.json({ skipped: 'revision tidak naik' });
  if (rec.is_active === false) return NextResponse.json({ skipped: 'tidak aktif' });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  const plain = (rec.message ?? '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
  const payload = JSON.stringify({
    title: rec.version_label ? `${rec.title} (${rec.version_label})` : rec.title,
    body: plain.length > 140 ? plain.slice(0, 137) + '...' : plain,
    url: '/dashboard',
    tag: 'fanos-announcement',
  });

  const admin = createAdminClient();
  const { data: subs, error } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) dead.push(s.id); // langganan sudah tidak berlaku
    }
  }));
  if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
  return NextResponse.json({ sent, removed: dead.length, total: subs?.length ?? 0 });
}
