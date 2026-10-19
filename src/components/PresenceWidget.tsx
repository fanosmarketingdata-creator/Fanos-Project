'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Person = { id: string; full_name: string; photo_url: string | null; role: string };

const MAX_AVATARS = 4;

// Indikator "siapa yang sedang aktif" (Supabase Realtime Presence).
// Hanya dirender untuk non-Superuser, dan akun Superuser tidak pernah ikut
// ditampilkan: daftar hanya berisi akun Active ber-role selain Superuser.
export default function PresenceWidget({ meId }: { meId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [people, setPeople] = useState<Person[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

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

  const online = sorted.filter((p) => onlineIds.has(p.id));
  const offline = sorted.filter((p) => !onlineIds.has(p.id));
  const shown = sorted.slice(0, MAX_AVATARS);
  const remaining = sorted.length - shown.length;

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

      {open && (
        <>
          <div className="fixed inset-0 z-[900]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-[950] max-h-80 w-60 overflow-y-auto rounded-xl border border-slate-100 bg-white p-2.5 shadow-xl">
            {online.length > 0 && <Section title={`Aktif (${online.length})`} people={online} active />}
            {offline.length > 0 && <Section title={`Tidak Aktif (${offline.length})`} people={offline} />}
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, people, active }: { title: string; people: Person[]; active?: boolean }) {
  return (
    <div className="mb-1">
      <div className="px-1.5 py-1 text-[10px] font-bold uppercase text-slate-400">{title}</div>
      {people.map((p) => (
        <div key={p.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
          <div className="relative">
            <Avatar person={p} className="h-7 w-7" />
            {/* titik status di luar lapisan yang di-clip (overflow-hidden) supaya tetap bulat sempurna */}
            <span
              className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                active ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
          </div>
          <div className="leading-tight">
            <div className="text-[12.5px] font-semibold text-slate-800">{p.full_name}</div>
            <div className="text-[10px] text-slate-400">{p.role}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ person, className }: { person: Person; className: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[11px] font-bold text-slate-500 ${className}`}>
      {person.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.photo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        person.full_name.charAt(0).toUpperCase()
      )}
    </div>
  );
}
