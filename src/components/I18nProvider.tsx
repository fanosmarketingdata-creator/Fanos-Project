'use client';

import { createContext, useContext, useLayoutEffect } from 'react';
import { translateText, translateTextId } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/lang';

const LangContext = createContext<Lang>('en');
export const useLang = () => useContext(LangContext);

let tx: (s: string) => string = translateText;
let curLang: Lang = 'en';

// Mode debug kosakata: di Console browser jalankan  localStorage.setItem('fanos-i18n-debug','1')  lalu muat ulang.
// Teks yang tampaknya BELUM terterjemah diberi garis putus-putus merah dan dikumpulkan; ketik  __i18nMissing()  di Console
// untuk melihat daftarnya (tambahkan ke src/lib/i18n/locales/en.ts atau id.ts). Matikan: localStorage.removeItem('fanos-i18n-debug').
const DEBUG_IDS = /\b(yang|dan|untuk|tidak|dengan|belum|sudah|harus|silakan|atau|dari|pada|akan|nama|tanggal|jumlah|harga|keterangan|catatan|alamat|nomor|jenis|simpan|hapus|tambah|batal|cari|pilih|gagal|berhasil|semua|baru)\b/i;
const DEBUG_ENS = /\b(the|and|for|with|not|please|select|enter|search|add|delete|save|cancel|required|invalid|failed|success|total|date|name|address|number|type|amount|price|quantity|description|notes|all|new|view|create)\b/i;
const missing = new Set<string>();
let debugOn = false;
function debugCheck(node: Node, v: string, t: string, lang: Lang) {
  if (!debugOn || t !== v) return;
  const s = v.replace(/\s+/g, ' ').trim();
  if (s.length < 3 || /^[\d\s.,:;/()%+\-–—Rp]+$/.test(s)) return;
  const bad = lang === 'en' ? DEBUG_IDS.test(s) : DEBUG_ENS.test(s);
  if (!bad) return;
  missing.add(s);
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  if (el) (el as HTMLElement).style.outline = '1px dashed #ef4444';
}
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'CODE', 'NOSCRIPT']);

function skipped(el: Element | null) {
  return !!el && (SKIP.has(el.tagName) || !!el.closest('[data-no-i18n]'));
}

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Isi textarea adalah ketikan pengguna, jangan diterjemahkan (atributnya tetap).
    if (skipped(node.parentElement) || node.parentElement?.tagName === 'TEXTAREA') return;
    const v = node.nodeValue ?? '';
    const t = tx(v);
    if (t !== v) node.nodeValue = t;
    else debugCheck(node, v, t, curLang);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (skipped(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v) {
      const t = tx(v);
      if (t !== v) el.setAttribute(a, t);
      else debugCheck(el, v, t, curLang);
    }
  }
  el.childNodes.forEach(translateNode);
}

// Bahasa Inggris (default): teks sumber berbahasa Indonesia diterjemahkan lewat kamus.
// Perubahan DOM berikutnya (navigasi, toast, modal) ikut diterjemahkan oleh observer.
export default function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    tx = lang === 'en' ? translateText : translateTextId;
    curLang = lang;
    try { debugOn = localStorage.getItem('fanos-i18n-debug') === '1'; } catch { debugOn = false; }
    (window as unknown as { __i18nMissing?: () => string[] }).__i18nMissing = () => { const a = Array.from(missing).sort(); console.log(a.join('\n')); return a; };
    translateNode(document.body);
    root.setAttribute('data-i18n', 'done');

    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'childList') m.addedNodes.forEach(translateNode);
        else if (m.type === 'characterData') translateNode(m.target);
        else if (m.type === 'attributes') translateNode(m.target);
      }
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
    return () => obs.disconnect();
  }, [lang]);

  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}
