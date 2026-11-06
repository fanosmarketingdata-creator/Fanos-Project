'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';

type Person = { id: string; full_name: string; photo_url: string | null; role: string };

// Indikator "siapa yang sedang aktif" (Supabase Realtime Presence).
// Hanya dirender untuk non-Superuser, dan akun Superuser tidak pernah ikut
// ditampilkan: daftar hanya berisi akun Active ber-role selain Superuser.
const MAX_AVATARS = 4;

export default function PresenceWidget({ meId }: { meId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [people, setPeople] = useState<Person[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Esc menutup panel; body tidak ikut scroll saat panel terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, photo_url, role')
      .eq('status', 'Active')
      .neq('role', 'Superuser')
      .order('full_name')
      .then(({ data }) => setPeople(data ?? []));
  }, [supabase]);

  useEffect(() => {
    // key presence = id user, jadi satu user dengan beberapa tab tetap dihitung satu.
    const channel = supabase.channel('online-users', { config: { presence: { key: meId } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ at: new Date().toISOString() });
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, meId]);

  const sorted = useMemo(
    () =>
      [...people].sort((a, b) => {
        const ao = onlineIds.has(a.id);
        const bo = onlineIds.has(b.id);
        if (ao !== bo) return ao ? -1 : 1;
        return a.full_name.localeCompare(b.full_name);
      }),
    [people, onlineIds]
  );

  if (sorted.length <= 1) return null; // sendirian: tidak ada yang perlu ditampilkan

  const needle = q.trim().toLowerCase();
  const match = (p: Person) => !needle || p.full_name.toLowerCase().includes(needle) || p.role.toLowerCase().includes(needle);
  const online = sorted.filter((p) => onlineIds.has(p.id) && match(p));
  const offline = sorted.filter((p) => !onlineIds.has(p.id) && match(p));
  const totalOnline = sorted.filter((p) => onlineIds.has(p.id)).length;

  // Avatar bertumpuk tidak menyertakan user yang sedang login (sudah punya dot hijau di profilnya);
  // panel yang terbuka tetap menampilkan semua user termasuk dirinya.
  const others = sorted.filter((p) => p.id !== meId);
  const shown = others.slice(0, MAX_AVATARS);
  const remaining = others.length - shown.length;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center pl-2" title="Lihat pengguna yang sedang aktif">
        {shown.map((p, i) => (
          <Avatar
            key={p.id}
            person={p}
            className={`${i > 0 ? '-ml-2.5' : ''} h-[30px] w-[30px] border-2 border-white ${
              onlineIds.has(p.id) ? 'ring-2 ring-emerald-500' : ''
            }`}
          />
        ))}
        {remaining > 0 && (
          <span className="-ml-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-orange-400 text-[10px] font-bold text-white">
            +{remaining}
          </span>
        )}
      </button>
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[1000]" data-perm-ignore>
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <aside
            role="dialog"
            aria-label="Pengguna Aktif"
            className="absolute right-0 top-0 flex h-full w-[380px] max-w-full flex-col rounded-l-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-6 pb-3 pt-5">
              <h2 className="text-xl font-bold text-slate-900">Pengguna Aktif</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="mx-6 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex">
                {sorted.slice(0, 4).map((p, i) => (
                  <Avatar key={p.id} person={p} className={`${i > 0 ? '-ml-3' : ''} h-10 w-10 border-2 border-white`} />
                ))}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-slate-800">{totalOnline} <span className="font-semibold text-emerald-600">Aktif</span></div>
                <div className="text-[11px] text-slate-500">{sorted.length} <span>Pengguna</span></div>
              </div>
            </div>

            <div className="px-6 pt-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari pengguna..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <div className="mt-2 flex-1 overflow-y-auto px-6 pb-6">
              {online.length > 0 && <Section title="Aktif" people={online} active />}
              {offline.length > 0 && <Section title="Tidak Aktif" people={offline} />}
              {online.length === 0 && offline.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">Pengguna tidak ditemukan</div>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
}

function Section({ title, people, active }: { title: string; people: Person[]; active?: boolean }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-sm font-bold text-slate-800">{title}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{people.length}</span>
      </div>
      {people.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
          <div className="relative">
            <Avatar person={p} className="h-11 w-11 text-sm" />
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${active ? 'bg-emerald-500' : 'bg-slate-400'}`}
            />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[14px] font-semibold text-slate-800">{p.full_name}</div>
            <div className="truncate text-[12px] text-slate-500">{p.role}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ person, className }: { person: Person; className: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[11px] font-bold text-slate-500 outline outline-1 -outline-offset-0 outline-slate-300 ${className}`}>
      {person.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.photo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        person.full_name.charAt(0).toUpperCase()
      )}
    </div>
  );
}
