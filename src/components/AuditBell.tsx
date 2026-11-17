'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/components/I18nProvider';
import { ACTION_META, actionVerb, entityLabel, timeAgo, type AuditLog } from '@/lib/audit';

const SEEN_KEY = 'fanos-audit-seen';

// Notifikasi dibaca dari activity_feed (ringkas, tanpa isi perubahan) agar bisa dilihat semua user.
type Feed = Pick<AuditLog, 'id' | 'created_at' | 'user_id' | 'user_name' | 'action' | 'table_name' | 'record_label'>;
const FEED_COLUMNS = 'id, created_at, user_id, user_name, action, table_name, record_label';

type Toast = { key: string; color: string; icon: string; who: string; text: string; label: string };

// Lonceng audit (di kiri avatar user) + "dynamic island" di bawah layar setiap ada aktivitas CRUD baru.
// Dipasang untuk semua user. Halaman Audit Log lengkap (dengan isi perubahan) hanya untuk Superuser.
export default function AuditBell({ meId, isSuperuser = false }: { meId?: string; isSuperuser?: boolean }) {
  const en = useLang() === 'en';
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<Feed[]>([]);
  const [seen, setSeen] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [leaving, setLeaving] = useState(false);
  const queue = useRef<Feed[]>([]);
  const busy = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try { setSeen(Number(localStorage.getItem(SEEN_KEY)) || 0); } catch { /* abaikan */ }
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.from('activity_feed').select(FEED_COLUMNS).order('created_at', { ascending: false }).limit(15);
    if (data) setLogs(data as Feed[]);
  }, [supabase]);

  // Tampilkan antrean island satu per satu; antrean panjang (mis. import massal) diringkas jadi satu kartu.
  const pump = useCallback(() => {
    if (busy.current || queue.current.length === 0) return;
    busy.current = true;
    let item: Toast;
    if (queue.current.length > 3) {
      const all = queue.current.splice(0);
      const users = Array.from(new Set(all.map((l) => l.user_name || 'System')));
      item = {
        key: all[0].id, color: '#a855f7', icon: 'fi fi-rr-layers', who: users.slice(0, 2).join(', ') + (users.length > 2 ? ` +${users.length - 2}` : ''),
        text: en ? `${all.length} new activities` : `${all.length} aktivitas baru`, label: '',
      };
    } else {
      const l = queue.current.shift()!;
      const m = ACTION_META[l.action];
      item = { key: l.id, color: m.color, icon: m.icon, who: l.user_name || 'System', text: `${actionVerb(l.action, en)} ${entityLabel(l.table_name, en)}`, label: l.record_label || '' };
    }
    setLeaving(false);
    setToast(item);
    setTimeout(() => setLeaving(true), 4600);
    setTimeout(() => { setToast(null); busy.current = false; pump(); }, 5000);
  }, [en]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('audit-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (payload) => {
        const l = payload.new as Feed;
        setLogs((prev) => [l, ...prev].slice(0, 15));
        if (l.user_id && l.user_id === meId) return; // aksi sendiri sudah punya toast konfirmasi
        queue.current.push(l);
        pump();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, load, meId, pump]);

  useEffect(() => {
    if (!open) return;
    load();
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, load]);

  const unread = logs.filter((l) => Date.parse(l.created_at) > seen && l.user_id !== meId).length;

  function toggle() {
    setOpen((o) => {
      if (o && logs[0]) {
        const t = Date.parse(logs[0].created_at);
        setSeen(t);
        try { localStorage.setItem(SEEN_KEY, String(t)); } catch { /* abaikan */ }
      }
      return !o;
    });
  }
  function markRead() {
    if (!logs[0]) return;
    const t = Date.parse(logs[0].created_at);
    setSeen(t);
    try { localStorage.setItem(SEEN_KEY, String(t)); } catch { /* abaikan */ }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={en ? 'Activity notifications' : 'Notifikasi aktivitas'}
        title={en ? 'Activity log' : 'Log aktivitas'}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-brand-500"
      >
        <i className="fi fi-rr-bell text-[15px] leading-none" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white" data-no-i18n>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="ab-pop absolute right-0 top-full z-[700] mt-3.5 w-[340px] max-w-[92vw] rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
            <span className="text-[12px] font-bold text-slate-800">{en ? 'Recent activity' : 'Aktivitas terbaru'}</span>
            <button type="button" onClick={markRead} className="text-[11px] font-medium text-brand-500 hover:underline">{en ? 'Mark all as read' : 'Tandai sudah dibaca'}</button>
          </div>
          <div className="max-h-[380px] overflow-y-auto p-1.5">
            {logs.length === 0 && <div className="px-3 py-8 text-center text-[12px] text-slate-400">{en ? 'No activity yet' : 'Belum ada aktivitas'}</div>}
            {logs.map((l) => {
              const m = ACTION_META[l.action];
              const isNew = Date.parse(l.created_at) > seen && l.user_id !== meId;
              return (
                <div key={l.id} className="flex gap-2.5 rounded-lg px-2.5 py-2 hover:bg-slate-50">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] text-white" style={{ background: m.color }}>
                    <i className={`${m.icon} leading-none`} />
                  </span>
                  <div className="min-w-0 flex-1" data-no-i18n>
                    <div className="text-[12px] leading-snug text-slate-700">
                      <b>{l.user_name || 'System'}</b> {actionVerb(l.action, en)} {entityLabel(l.table_name, en)}
                    </div>
                    {l.record_label && <div className="truncate text-[11.5px] font-semibold text-slate-800">{l.record_label}</div>}
                    <div className="text-[10.5px] text-slate-400">{timeAgo(l.created_at, en)}</div>
                  </div>
                  {isNew && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </div>
              );
            })}
          </div>
          {isSuperuser && (
            <Link href="/dashboard/audit-log" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-3.5 py-2.5 text-center text-[12px] font-semibold text-brand-500 hover:bg-slate-50">
              {en ? 'View full audit log' : 'Lihat seluruh log audit'} →
            </Link>
          )}
        </div>
      )}

      {mounted && toast && createPortal(
        <div className="ai-wrap" role="status" aria-live="polite">
          <div key={toast.key} className={`ai-card${leaving ? ' ai-leave' : ''}`} data-no-i18n>
            <span className="ai-ic" style={{ background: toast.color }}><i className={`${toast.icon} leading-none`} /></span>
            <span className="ai-txt">
              <span className="ai-line"><b>{toast.who}</b> {toast.text}</span>
              {toast.label && <span className="ai-sub">{toast.label}</span>}
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
