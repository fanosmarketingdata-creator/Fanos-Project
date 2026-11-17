'use client';

import { useEffect, useRef, useState } from 'react';
import { RT_MARK, isRich, plainToHtml, sanitizeHtml } from '@/lib/rich-text';

type Cmd = { icon: string; title: string; run: () => void; id?: string };

// Editor teks kaya ringan seperti Word: bold/italic/underline, bullet, nomor, huruf (a. b. c.),
// indent dengan Tab / Shift+Tab. Nilai disimpan sebagai HTML berawalan RT_MARK (lihat lib/rich-text).
export default function RichTextEditor({
  value,
  onChange,
  minHeight = 120,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Tandai tombol yang sedang aktif pada posisi kursor / teks terpilih (bold, italic, list, dsb).
  useEffect(() => {
    const update = () => {
      const el = ref.current;
      const sel = window.getSelection();
      if (!el || !sel || !sel.anchorNode || !el.contains(sel.anchorNode)) { setActive((a) => (Object.keys(a).length ? {} : a)); return; }
      const q = (c: string) => { try { return document.queryCommandState(c); } catch { return false; } };
      let n: Node | null = sel.anchorNode;
      let ol: HTMLElement | null = null;
      while (n && n !== el) { if (n.nodeType === 1 && (n as HTMLElement).tagName === 'OL') { ol = n as HTMLElement; break; } n = n.parentNode; }
      const ola = !!ol && ['a', 'A', 'i', 'I'].includes(ol.getAttribute('type') || '');
      const next = {
        bold: q('bold'), italic: q('italic'), underline: q('underline'),
        ul: q('insertUnorderedList'), ol: !!ol && !ola, ola, justify: q('justifyFull'),
      };
      setActive((a) => (JSON.stringify(a) === JSON.stringify(next) ? a : next));
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  const toHtml = (v: string) => (isRich(v) ? sanitizeHtml(v.slice(RT_MARK.length)) : plainToHtml(v));

  // Isi ulang hanya bila nilai berubah dari luar (ganti bahasa / Reset), supaya kursor tidak lompat saat mengetik.
  useEffect(() => {
    if (!ref.current || value === last.current) return;
    ref.current.innerHTML = toHtml(value);
    last.current = value;
  }, [value]);

  function emit() {
    if (!ref.current) return;
    const clean = sanitizeHtml(ref.current.innerHTML);
    if (clean === toHtml(value)) return; // tidak ada perubahan nyata: jangan ubah nilai (default tetap "default")
    const v = RT_MARK + clean;
    last.current = v;
    onChange(v);
  }
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };
  function closest(tag: string): HTMLElement | null {
    const n = window.getSelection()?.anchorNode ?? null;
    let el: Node | null = n;
    while (el && el !== ref.current) {
      if (el.nodeType === 1 && (el as HTMLElement).tagName.toLowerCase() === tag) return el as HTMLElement;
      el = el.parentNode;
    }
    return null;
  }
  function listType(type: '1' | 'a') {
    ref.current?.focus();
    let ol = closest('ol');
    if (!ol) {
      document.execCommand('insertOrderedList');
      ol = closest('ol');
    }
    if (ol) ol.setAttribute('type', type);
    emit();
  }

  const cmds: (Cmd | 'sep')[] = [
    { id: 'bold', icon: 'B', title: 'Tebal (Ctrl+B)', run: () => exec('bold') },
    { id: 'italic', icon: 'I', title: 'Miring (Ctrl+I)', run: () => exec('italic') },
    { id: 'underline', icon: 'U', title: 'Garis bawah (Ctrl+U)', run: () => exec('underline') },
    'sep',
    { id: 'ul', icon: '•', title: 'Daftar bullet', run: () => exec('insertUnorderedList') },
    { id: 'ol', icon: '1.', title: 'Daftar bernomor (1. 2. 3.)', run: () => listType('1') },
    { id: 'ola', icon: 'a.', title: 'Daftar huruf (a. b. c.)', run: () => listType('a') },
    'sep',
    { icon: '⇤', title: 'Kurangi indent (Shift+Tab)', run: () => exec('outdent') },
    { icon: '⇥', title: 'Tambah indent / paragraf menjorok (Tab)', run: () => exec('indent') },
    'sep',
    { icon: '≡', title: 'Rata kiri', run: () => exec('justifyLeft') },
    { id: 'justify', icon: '☰', title: 'Rata kiri-kanan (justify)', run: () => exec('justifyFull') },
  ];

  return (
    <div className="rte-box">
      <div className="rte-bar" data-no-i18n>
        {cmds.map((c, i) =>
          c === 'sep' ? (
            <span key={i} className="rte-sep" />
          ) : (
            <button
              key={i}
              type="button"
              title={c.title}
              aria-label={c.title}
              className={`rte-btn${c.id && active[c.id] ? ' on' : ''}${c.icon === 'B' ? ' b' : c.icon === 'I' ? ' i' : c.icon === 'U' ? ' u' : ''}`}
              aria-pressed={c.id ? !!active[c.id] : undefined}
              onMouseDown={(e) => { e.preventDefault(); c.run(); }}
            >
              {c.icon}
            </button>
          )
        )}
      </div>
      <div
        ref={ref}
        className="rte-area rt-view"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand(e.shiftKey ? 'outdent' : 'indent');
            emit();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
      />
    </div>
  );
}
