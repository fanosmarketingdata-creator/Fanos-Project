'use server';

import { createClient } from '@/lib/supabase/server';

type Sub = { endpoint: string; p256dh: string; auth: string; userAgent?: string; lang?: string };

export async function savePushSubscription(sub: Sub) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Belum login' };
  const row = { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: sub.userAgent ?? null };
  let { error } = await supabase.from('push_subscriptions').upsert({ ...row, lang: sub.lang === 'id' ? 'id' : 'en' }, { onConflict: 'endpoint' });
  // Kolom lang (migrasi 0043) belum ada: simpan tanpa bahasa.
  if (error && /lang/i.test(error.message)) ({ error } = await supabase.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' }));
  return error ? { error: error.message } : { success: true };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = createClient();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return error ? { error: error.message } : { success: true };
}
