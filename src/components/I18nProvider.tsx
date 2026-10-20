'use client';

import { createContext, useContext, useLayoutEffect } from 'react';
import { translateText, translateTextId } from '@/lib/i18n/dict';
import type { Lang } from '@/lib/i18n/lang';

const LangContext = createContext<Lang>('en');
export const useLang = () => useContext(LangContext);

let tx: (s: string) => string = translateText;
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'NOSCRIPT']);

function skipped(el: Element | null) {
  return !!el && (SKIP.has(el.tagName) || !!el.closest('[data-no-i18n]'));
}

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (skipped(node.parentElement)) return;
    const v = node.nodeValue ?? '';
    const t = tx(v);
    if (t !== v) node.nodeValue = t;
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
