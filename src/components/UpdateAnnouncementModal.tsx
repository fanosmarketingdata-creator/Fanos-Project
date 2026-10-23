'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/components/I18nProvider';
import type { Lang } from '@/lib/i18n/lang';

type Announcement = {
  id: string;
  title: string;
  message: string;
  title_en: string | null;
  message_en: string | null;
  version_label: string | null;
  revision: number;
};

const LABELS: Record<Lang, { close: string; dontShow: string; ok: string }> = {
  id: { close: 'Tutup', dontShow: 'Jangan tampilkan lagi', ok: 'Mengerti' },
  en: { close: 'Close', dontShow: "Don't show this again", ok: 'Got it' },
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
  const appLang = useLang();
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [dontShow, setDontShow] = useState(false);
  // Bahasa awal pop-up mengikuti bahasa aplikasi; bisa diganti user tanpa memuat ulang halaman.
  const [lang, setPopupLang] = useState<Lang>(appLang);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const nowIso = new Date().toISOString();
        // RLS sudah menyaring is_active & masa tampil; filter di sini sebagai lapis kedua.
        const { data, error } = await supabase
          .from('system_announcements')
          .select('id, title, message, title_en, message_en, version_label, revision')
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

  // Versi English hanya dipakai bila diisi lengkap di database.
  const hasEn = !!(ann.title_en?.trim() && ann.message_en?.trim());
  const shown: Lang = hasEn ? lang : 'id';
  const title = shown === 'en' ? ann.title_en! : ann.title;
  const message = shown === 'en' ? ann.message_en! : ann.message;
  const t = LABELS[shown];

  return (
    <div className="ann-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ann-modal" data-no-i18n role="dialog" aria-modal="true" aria-labelledby="ann-title">
        <div className="ann-header">
          <div className="ann-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          {/* Teks dari database: jangan lewat penerjemah otomatis (data-no-i18n) */}
          <h3 id="ann-title">{title}</h3>
          {ann.version_label && (
            <span className="ann-badge">{ann.version_label}</span>
          )}
          {hasEn && (
            <div className="ann-lang" role="group" aria-label="Language">
              <button type="button" className={shown === 'id' ? 'on' : ''} onClick={() => setPopupLang('id')}>
                ID
              </button>
              <button type="button" className={shown === 'en' ? 'on' : ''} onClick={() => setPopupLang('en')}>
                EN
              </button>
            </div>
          )}
          <button type="button" className="ann-close" onClick={close} aria-label={t.close}>
            ✕
          </button>
        </div>

        <div className="ann-body">{message}</div>

        <div className="ann-footer">
          <label className="ann-check">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            <span>{t.dontShow}</span>
          </label>
          <button type="button" className="ann-btn" onClick={close}>
            {t.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
