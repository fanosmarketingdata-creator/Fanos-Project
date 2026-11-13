import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

// Kirim Web Push ke semua perangkat yang sudah mengaktifkan notifikasi (tabel push_subscriptions).
export type PushText = { title: string; body: string };
// Satu bahasa per perangkat: pakai bahasa yang dipilih pengguna (kolom lang; kosong = Inggris, bahasa bawaan aplikasi).
export async function sendPushToAll(payload: { id: PushText; en: PushText; url?: string; tag?: string }): Promise<{ sent: number; total: number; skipped?: string }> {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { sent: 0, total: 0, skipped: 'VAPID key belum diset' };
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
    const admin = createAdminClient();
    type Sub = { id: string; endpoint: string; p256dh: string; auth: string; lang?: string | null };
    let subs: Sub[] | null = null;
    const r1 = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth, lang');
    if (r1.error) {
      const r2 = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth'); // kolom lang belum ada
      if (r2.error) return { sent: 0, total: 0, skipped: r2.error.message };
      subs = r2.data as Sub[];
    } else subs = r1.data as Sub[];
    const make = (txt: PushText) => JSON.stringify({ url: payload.url ?? '/dashboard', tag: payload.tag ?? 'fanos-maintenance', title: txt.title, body: txt.body });
    const bodyId = make(payload.id);
    const bodyEn = make(payload.en);
    let sent = 0;
    const dead: string[] = [];
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, s.lang === 'id' ? bodyId : bodyEn, { TTL: 60 * 60 * 12 });
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
