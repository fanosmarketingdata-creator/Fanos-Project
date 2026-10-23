'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Announcement = {
  id: string;
  title: string;
  message: string;
  version_label: string | null;
  revision: number;
};

const STORAGE_PREFIX = 'fanos_announcement_hidden:';

// Kunci per pengumuman + revision, jadi menaikkan `revision` di database
// akan memunculkan pop-up lagi walaupun user pernah mencentang "jangan tampilkan lagi".
function storageKey(a: Pick<Announcement, 'id' | 'revision'>) {
  return `${STORAGE_PREFIX}${a.id}:${a.revision}`;
}

// Pop-up pemberitahuan update sistem di halaman login.
// Isi & masa tampil diambil dari tabel public.system_announcements (lihat migration 0020).
export default function UpdateAnnouncementModal() {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const nowIso = new Date().toISOString();
        // RLS sudah menyaring is_active & masa tampil; filter di sini sebagai lapis kedua.
        const { data, error } = await supabase
          .from('system_announcements')
          .select('id, title, message, version_label, revision')
          .eq('is_active', true)
          .lte('starts_at', nowIso)
          .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
          .order('starts_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data || cancelled) return;

        try {
          if (localStorage.getItem(storageKey(data)) === '1') return;
        } catch {
          // localStorage tidak tersedia (mode privat ketat) — tetap tampilkan.
        }
        setAnn(data as Announcement);
      } catch {
        // Gagal memuat pengumuman tidak boleh mengganggu proses login.
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function close() {
    if (ann && dontShow) {
      try {
        localStorage.setItem(storageKey(ann), '1');
      } catch {
        // abaikan
      }
    }
    setAnn(null);
  }

  useEffect(() => {
    if (!ann) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ann, dontShow]);

  if (!ann) return null;

  return (
    <div className="ann-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ann-modal" role="dialog" aria-modal="true" aria-labelledby="ann-title">
        <div className="ann-header">
          <div className="ann-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          {/* Teks dari database: jangan lewat penerjemah otomatis (data-no-i18n) */}
          <h3 id="ann-title" data-no-i18n>
            {ann.title}
          </h3>
          {ann.version_label && (
            <span className="ann-badge" data-no-i18n>
              {ann.version_label}
            </span>
          )}
          <button type="button" className="ann-close" onClick={close} aria-label="Tutup">
            ✕
          </button>
        </div>

        <div className="ann-body" data-no-i18n>
          {ann.message}
        </div>

        <div className="ann-footer">
          <label className="ann-check">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            <span>Jangan tampilkan lagi</span>
          </label>
          <button type="button" className="ann-btn" onClick={close}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
