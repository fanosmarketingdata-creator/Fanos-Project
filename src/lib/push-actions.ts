'use server';

import { createClient } from '@/lib/supabase/server';

type Sub = { endpoint: string; p256dh: string; auth: string; userAgent?: string };

export async function savePushSubscription(sub: Sub) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Belum login' };
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: sub.userAgent ?? null }, { onConflict: 'endpoint' });
  return error ? { error: error.message } : { success: true };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = createClient();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return error ? { error: error.message } : { success: true };
}
