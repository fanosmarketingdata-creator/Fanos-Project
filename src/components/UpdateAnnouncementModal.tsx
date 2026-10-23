'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
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

const LABELS: Record<Lang, { close: string; dontShow: string; ok: string; badge: string }> = {
  id: { close: 'Tutup', dontShow: 'Jangan tampilkan lagi', ok: 'Mengerti', badge: 'Info Terbaru' },
  en: { close: 'Close', dontShow: "Don't show this again", ok: 'Got it', badge: 'Latest Update' },
};

const STORAGE_PREFIX = 'fanos_announcement_hidden:';
const EXIT_MS = 200;

// Kunci per pengumuman + revision, jadi menaikkan `revision` di database
// akan memunculkan pop-up lagi walaupun user pernah mencentang "jangan tampilkan lagi".
function storageKey(a: Pick<Announcement, 'id' | 'revision'>) {
  return `${STORAGE_PREFIX}${a.id}:${a.revision}`;
}

// **tebal** -> <strong>. Dirender sebagai elemen React (bukan HTML mentah), jadi aman.
function inline(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

// Teks dari database ditampilkan sesuai ketikan: baris kosong = jarak,
// "- " / "• " / "* " = poin, "1." / "1)" = nomor, selebihnya paragraf biasa.
function renderMessage(message: string) {
  return message.split('\n').map((raw, i) => {
    const line = raw.replace(/\s+$/, '');
    const style = { animationDelay: `${Math.min(i, 12) * 55 + 150}ms` };
    if (!line.trim()) return <div key={i} className="ann-gap" />;

    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    if (bullet)
      return (
        <div key={i} className="ann-line ann-li" style={style}>
          <span className="ann-dot" aria-hidden="true" />
          <span>{inline(bullet[1])}</span>
        </div>
      );

    const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (num)
      return (
        <div key={i} className="ann-line ann-li" style={style}>
          <span className="ann-num" aria-hidden="true">
            {num[1]}
          </span>
          <span>{inline(num[2])}</span>
        </div>
      );

    return (
      <p key={i} className="ann-line ann-p" style={style}>
        {inline(line.trim())}
      </p>
    );
  });
}

// Pop-up pemberitahuan update sistem di halaman login.
// Isi & masa tampil diambil dari tabel public.system_announcements (lihat migration 0020 & 0021).
export default function UpdateAnnouncementModal() {
  const appLang = useLang();
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const [closing, setClosing] = useState(false);
  // Bahasa awal pop-up mengikuti bahasa aplikasi; bisa diganti user tanpa memuat ulang halaman.
  const [lang, setPopupLang] = useState<Lang>(appLang);
  const headerRef = useRef<HTMLDivElement>(null);
  // Ganti bahasa memicu animasi ulang pada isi pesan.
  const [langTick, setLangTick] = useState(0);

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

  const close = useCallback(() => {
    if (!ann || closing) return;
    if (dontShow) {
      try {
        localStorage.setItem(storageKey(ann), '1');
      } catch {
        // abaikan
      }
    }
    setClosing(true);
    window.setTimeout(() => setAnn(null), EXIT_MS);
  }, [ann, closing, dontShow]);

  useEffect(() => {
    if (!ann) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [ann, close]);

  // Cahaya di header mengikuti posisi kursor.
  function onHeaderMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = headerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }

  if (!ann) return null;

  // Versi English hanya dipakai bila diisi lengkap di database.
  const hasEn = !!(ann.title_en?.trim() && ann.message_en?.trim());
  const shown: Lang = hasEn ? lang : 'id';
  const title = shown === 'en' ? ann.title_en! : ann.title;
  const message = shown === 'en' ? ann.message_en! : ann.message;
  const t = LABELS[shown];

  function pick(l: Lang) {
    if (l === shown) return;
    setPopupLang(l);
    setLangTick((x) => x + 1);
  }

  return (
    <div className={`ann-overlay${closing ? ' is-closing' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="ann-modal" data-no-i18n role="dialog" aria-modal="true" aria-labelledby="ann-title">
        <div className="ann-header" ref={headerRef} onMouseMove={onHeaderMove}>
          <span className="ann-orb o1" aria-hidden="true" />
          <span className="ann-orb o2" aria-hidden="true" />
          <span className="ann-orb o3" aria-hidden="true" />

          <div className="ann-top">
            <span className="ann-tag">
              <i aria-hidden="true" />
              {t.badge}
            </span>
            <div className="ann-top-right">
              {hasEn && (
                <div className="ann-lang" role="group" aria-label="Language" data-on={shown}>
                  <span className="ann-lang-pill" aria-hidden="true" />
                  <button type="button" className={shown === 'id' ? 'on' : ''} onClick={() => pick('id')}>
                    ID
                  </button>
                  <button type="button" className={shown === 'en' ? 'on' : ''} onClick={() => pick('en')}>
                    EN
                  </button>
                </div>
              )}
              <button type="button" className="ann-close" onClick={close} aria-label={t.close}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="ann-title-row">
            <div className="ann-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="ann-title-wrap" key={`t${langTick}`}>
              <h3 id="ann-title">{title}</h3>
              {ann.version_label && <span className="ann-badge">{ann.version_label}</span>}
            </div>
          </div>
        </div>

        <div className="ann-body" key={`b${langTick}`}>
          {renderMessage(message)}
        </div>

        <div className="ann-footer">
          <label className="ann-check">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
            <span className="ann-box" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <span>{t.dontShow}</span>
          </label>
          <button type="button" className="ann-btn" onClick={close}>
            <span>{t.ok}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
