import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

// Kirim Web Push ke semua perangkat yang sudah mengaktifkan notifikasi (tabel push_subscriptions).
export async function sendPushToAll(payload: { title: string; body: string; url?: string; tag?: string }): Promise<{ sent: number; total: number; skipped?: string }> {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { sent: 0, total: 0, skipped: 'VAPID key belum diset' };
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
    const admin = createAdminClient();
    const { data: subs, error } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth');
    if (error) return { sent: 0, total: 0, skipped: error.message };
    const body = JSON.stringify({ url: '/dashboard', tag: 'fanos-maintenance', ...payload });
    let sent = 0;
    const dead: string[] = [];
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 12 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }));
    if (dead.length) await admin.from('push_subscriptions').delete().in('id', dead);
    return { sent, total: subs?.length ?? 0 };
  } catch (e) {
    return { sent: 0, total: 0, skipped: (e as Error).message };
  }
}
