import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { maintenanceTick } from '@/lib/maintenance-tick';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Boleh dipanggil: (a) pengguna yang sedang login (polling klien), atau (b) cron eksternal dengan header x-webhook-secret = PUSH_WEBHOOK_SECRET.
async function handle(req: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  let ok = !!secret && req.headers.get('x-webhook-secret') === secret;
  if (!ok) {
    const { data } = await createClient().auth.getUser();
    ok = !!data.user;
  }
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await maintenanceTick());
}
export const POST = handle;
export const GET = handle;
