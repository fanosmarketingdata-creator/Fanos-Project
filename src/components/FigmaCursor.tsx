'use client';

import { useEffect, useRef } from 'react';

// Kursor bergaya multiplayer (glyph + tag nama) yang MENGGANTIKAN kursor sistem.
// - Hotspot glyph tepat di titik pointer (tanpa jeda); hanya tag nama yang menyusul dengan halus.
// - Bentuk mengikuti konteks seperti kursor sistem: default, pointer, text, wait, help, crosshair,
//   not-allowed, grab/grabbing, zoom-in, zoom-out.
// - Warna ditentukan Superuser per akun (Master Akun).
// - Tidak dipasang bila pengguna memilih gerak dikurangi atau perangkat tanpa pointer halus;
//   pada kondisi itu kursor sistem tetap tampil seperti biasa.
//
// Cara menentukan bentuk (urutan prioritas), karena kursor sistem disembunyikan dan tidak bisa dibaca:
//   1. document.documentElement.dataset.cursor = 'wait' | ...   (paksa global, mis. saat proses berat)
//   2. elemen sibuk: [aria-busy=true], .login-overlay, atau tombol nonaktif yang sedang memproses
//   3. penanda eksplisit: atribut data-cursor="grab", style="cursor:..." atau kelas cursor-grab, dst.
//   4. elemen nonaktif (:disabled, [aria-disabled=true])  -> not-allowed
//   5. kolom isian teks                                    -> text
//   6. tombol, tautan, kartu yang bisa diklik              -> pointer
//   7. selain itu                                          -> default
// Saat tombol pointer ditekan di atas elemen grab, bentuk berubah menjadi grabbing.

const SIZE = 22;
const RADIUS = 1.75;
const FOLLOW = 0.34;
const COLOUR = '#5B9BF6';
const SVGNS = 'http://www.w3.org/2000/svg';

type CursorType =
  | 'default' | 'pointer' | 'text' | 'wait' | 'help' | 'crosshair'
  | 'not-allowed' | 'grab' | 'grabbing' | 'zoom-in' | 'zoom-out';

const TYPES: CursorType[] = ['default', 'pointer', 'text', 'wait', 'help', 'crosshair', 'not-allowed', 'grab', 'grabbing', 'zoom-in', 'zoom-out'];
const ALIASES: Record<string, CursorType> = { progress: 'wait', move: 'grab', 'all-scroll': 'grab' };

const INTERACTIVE =
  'a, button, summary, label, select, [role=button], [role=menuitem], [role=tab], input[type=checkbox], input[type=radio], input[type=button], input[type=submit], input[type=file], input[type=color], input[type=range], .cursor-pointer, .client-card, .product-card-image, .product-card-body, .modal-close';
const TEXT_FIELD =
  'textarea, [contenteditable=""], [contenteditable="true"], input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]):not([type=color]):not([type=range]):not([type=image]):not([type=reset])';
const DISABLED = ':disabled, [aria-disabled="true"]';
const BUSY = '[aria-busy="true"], .login-overlay';
const BUSY_LABEL = /^(menyimpan|memproses|menghapus|memverifikasi|mengunggah|sedang|memuat)/i;
const CLASS_RE = /(?:^|\s)cursor-(default|pointer|text|wait|progress|help|crosshair|not-allowed|grab|grabbing|zoom-in|zoom-out|move)(?:\s|$)/;

function normalise(v: string | null | undefined): CursorType | null {
  if (!v) return null;
  const k = v.trim().split(/\s+/).pop() as string; // "url(x) pointer" -> "pointer"
  if ((TYPES as string[]).includes(k)) return k as CursorType;
  return ALIASES[k] ?? null;
}

function explicitType(start: Element | null): CursorType | null {
  for (let n: Element | null = start; n && n !== document.documentElement; n = n.parentElement) {
    const d = normalise(n.getAttribute('data-cursor'));
    if (d) return d;
    const inline = normalise((n as HTMLElement).style?.cursor);
    if (inline) return inline;
    const m = CLASS_RE.exec(n.getAttribute('class') || '');
    if (m) return normalise(m[1]);
  }
  return null;
}

function resolveType(el: Element | null): CursorType {
  const forced = normalise(document.documentElement.getAttribute('data-cursor'));
  if (forced) return forced;
  if (!el) return 'default';
  if (el.closest(BUSY)) return 'wait';
  const btn = el.closest('button');
  if (btn && (btn as HTMLButtonElement).disabled && BUSY_LABEL.test((btn.textContent || '').trim())) return 'wait';
  const explicit = explicitType(el);
  if (explicit) return explicit;
  if (el.closest(DISABLED)) return 'not-allowed';
  if (el.closest(TEXT_FIELD)) return 'text';
  if (el.closest(INTERACTIVE)) return 'pointer';
  return 'default';
}

// ---------- glyph ----------
type P = [number, number];
type Glyph = { hot: P; tag: P; outline: string; fill: string };

const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

const ARROW_PTS: P[] = [[1, 1], [1, 16.6], [5.2, 12.9], [8.2, 19.8], [11.3, 18.5], [8.4, 11.7], [13.8, 11.7]];
function roundedPath(pts: P[], r: number) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const da = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const db = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const t = Math.min(r * 1.8, da / 2, db / 2);
    const s = [p[0] + ((a[0] - p[0]) / da) * t, p[1] + ((a[1] - p[1]) / da) * t];
    const e = [p[0] + ((b[0] - p[0]) / db) * t, p[1] + ((b[1] - p[1]) / db) * t];
    d += `${i === 0 ? 'M' : 'L'}${s[0].toFixed(2)} ${s[1].toFixed(2)}Q${p[0]} ${p[1]} ${e[0].toFixed(2)} ${e[1].toFixed(2)}`;
  }
  return d + 'Z';
}

// Glyph dari bentuk terisi: lapisan luar putih (kontur) lalu lapisan warna akun di atasnya.
function solid(paths: string[], hot: P, tag: P): Glyph {
  return {
    hot,
    tag,
    outline: paths.map((d) => `<path d="${d}" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>`).join(''),
    fill: paths.map((d) => `<path d="${d}" fill="currentColor"/>`).join(''),
  };
}

const ARROW_D = roundedPath(ARROW_PTS, RADIUS);
const LENS = '<circle cx="8.5" cy="8.5" r="6" fill="#fff" stroke="currentColor" stroke-width="2.4"/><path d="M13.1 13.1L19 19" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>';
const LENS_OUT = '<circle cx="8.5" cy="8.5" r="6" fill="#fff" stroke="#fff" stroke-width="5"/><path d="M13.1 13.1L19 19" stroke="#fff" stroke-width="6.4" stroke-linecap="round"/>';

const GLYPHS: Record<CursorType, Glyph> = {
  default: solid([ARROW_D], [1, 1], [14.6, 19.6]),
  pointer: solid(
    [rr(7.4, 1, 3.2, 11, 1.6), rr(10.6, 7.2, 3, 6.5, 1.5), rr(13.6, 8, 3, 5.7, 1.5), rr(16.6, 9, 2.8, 4.8, 1.4), rr(5.2, 10, 14.2, 9, 4), rr(2.8, 11.2, 3.6, 6.4, 1.8)],
    [9, 1], [12, 19]
  ),
  text: solid([rr(5, 1, 8, 2.2, 1.1), rr(5, 16.8, 8, 2.2, 1.1), rr(8, 2, 2, 16, 0.6)], [9, 10], [10, 12]),
  crosshair: solid([rr(1, 9.1, 18, 1.8, 0.9), rr(9.1, 1, 1.8, 18, 0.9)], [10, 10], [12, 12]),
  grab: solid(
    [rr(5, 3.5, 2.8, 10, 1.4), rr(8, 1.5, 2.8, 12, 1.4), rr(11, 2, 2.8, 11.5, 1.4), rr(14, 4, 2.8, 9.5, 1.4), rr(5, 10, 11.8, 8.5, 4), rr(1.6, 10, 2.8, 6, 1.4)],
    [10.5, 10], [11, 10]
  ),
  grabbing: solid(
    [rr(3.5, 8, 14, 10, 4), rr(4.2, 5.5, 3, 6, 1.5), rr(7.3, 4.5, 3, 7, 1.5), rr(10.4, 4.8, 3, 6.5, 1.5), rr(13.5, 5.5, 3, 6, 1.5), rr(2, 12, 6.5, 2.8, 1.4)],
    [10.5, 11], [11, 10]
  ),
  'not-allowed': {
    hot: [10, 10],
    tag: [12, 12],
    outline: '<circle cx="10" cy="10" r="7.6" fill="#fff" stroke="#fff" stroke-width="5.4"/>',
    fill: '<circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M4.6 15.4L15.4 4.6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  },
  wait: {
    hot: [10, 10],
    tag: [12, 12],
    outline: '<circle cx="10" cy="10" r="7.4" fill="#fff" stroke="#fff" stroke-width="5.4"/>',
    fill: '<circle cx="10" cy="10" r="7.4" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="2.6"/><g class="fc-spin"><path d="M10 2.6a7.4 7.4 0 0 1 7.4 7.4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></g>',
  },
  help: {
    hot: [1, 1],
    tag: [16, 23],
    outline:
      `<path d="${ARROW_D}" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>` +
      '<circle cx="17" cy="17" r="5.6" fill="#fff" stroke="#fff" stroke-width="2.5"/>',
    fill:
      `<path d="${ARROW_D}" fill="currentColor"/>` +
      '<circle cx="17" cy="17" r="5.6" fill="currentColor"/>' +
      '<path d="M15.3 15.2a1.8 1.8 0 1 1 2.5 1.6c-.6.3-.8.6-.8 1.1" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/><circle cx="17" cy="19.5" r=".85" fill="#fff"/>',
  },
  'zoom-in': {
    hot: [8.5, 8.5],
    tag: [13, 14],
    outline: LENS_OUT,
    fill: LENS + '<path d="M5.6 8.5h5.8M8.5 5.6v5.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  },
  'zoom-out': {
    hot: [8.5, 8.5],
    tag: [13, 14],
    outline: LENS_OUT,
    fill: LENS + '<path d="M5.6 8.5h5.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

// Teks tag hitam atau putih, mana yang kontrasnya lebih tinggi terhadap warna latar.
function inkFor(hex: string) {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  return (L + 0.05) / 0.054 >= 1.05 / (L + 0.05) ? '#0d0d0d' : '#ffffff';
}

export default function FigmaCursor({ name = 'you', colour = COLOUR }: { name?: string; colour?: string }) {
  const safeColour = HEX.test(colour) ? colour : COLOUR;
  const nameRef = useRef(name);
  nameRef.current = name;
  const colourRef = useRef(safeColour);
  colourRef.current = safeColour;
  const tagRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Warna bisa berubah tanpa memasang ulang efek.
  useEffect(() => {
    if (svgRef.current) svgRef.current.style.color = safeColour;
    if (tagRef.current) {
      tagRef.current.style.background = safeColour;
      tagRef.current.style.color = inkFor(safeColour);
    }
  }, [safeColour]);

  // Nama bisa berubah tanpa memasang ulang efek.
  useEffect(() => {
    if (tagRef.current) tagRef.current.textContent = name || 'you';
  }, [name]);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let teardown: (() => void) | null = null;

    function mount() {
      const root = document.createElement('div');
      root.className = 'fc print:hidden';
      root.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('div');
      inner.className = 'fc-inner';

      const s = SIZE / 22;
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', String(24 * s));
      svg.setAttribute('height', String(24 * s));
      svg.style.color = colourRef.current;
      svgRef.current = svg;

      const tag = document.createElement('div');
      tag.className = 'fc-tag';
      tag.textContent = nameRef.current || 'you';
      tag.style.background = colourRef.current;
      tag.style.color = inkFor(colourRef.current);
      tagRef.current = tag;

      inner.appendChild(svg);
      inner.appendChild(tag);
      root.appendChild(inner);
      document.body.appendChild(root);

      let current: CursorType | null = null;
      const setType = (t: CursorType) => {
        if (t === current) return;
        current = t;
        const g = GLYPHS[t];
        svg.innerHTML = g.outline + g.fill;
        svg.style.left = `${-g.hot[0] * s}px`;
        svg.style.top = `${-g.hot[1] * s}px`;
        tag.style.left = `${g.tag[0] * s}px`;
        tag.style.top = `${g.tag[1] * s}px`;
        root.setAttribute('data-type', t);
      };
      setType('default');

      const st = { x: 0, y: 0, tx: 0, ty: 0, seen: false, raf: 0, last: 0, pressed: false, cx: 0, cy: 0 };

      const placeTag = () => {
        tag.style.transform = `translate3d(${(st.x - st.tx).toFixed(2)}px,${(st.y - st.ty).toFixed(2)}px,0)`;
      };
      const frame = (now: number) => {
        const dt = st.last ? Math.min(now - st.last, 64) : 16.7;
        st.last = now;
        const k = 1 - Math.pow(1 - FOLLOW, dt / 16.667);
        st.x += (st.tx - st.x) * k;
        st.y += (st.ty - st.y) * k;
        placeTag();
        if (Math.abs(st.tx - st.x) < 0.05 && Math.abs(st.ty - st.y) < 0.05) {
          st.x = st.tx; st.y = st.ty; st.raf = 0; st.last = 0; // diam sampai pointer bergerak lagi
          placeTag();
          return;
        }
        st.raf = requestAnimationFrame(frame);
      };
      const wake = () => { if (!st.raf) st.raf = requestAnimationFrame(frame); };

      const refresh = () => {
        let t = resolveType(document.elementFromPoint(st.cx, st.cy));
        if (t === 'grab' && st.pressed) t = 'grabbing';
        setType(t);
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        st.cx = e.clientX;
        st.cy = e.clientY;
        st.tx = e.clientX;
        st.ty = e.clientY;
        // Hotspot selalu tepat di pointer; hanya tag yang menyusul.
        root.style.transform = `translate3d(${st.tx}px,${st.ty}px,0)`;
        if (!st.seen) {
          st.seen = true; st.x = st.tx; st.y = st.ty;
          document.documentElement.classList.add('fc-hide-native'); // sembunyikan kursor sistem setelah overlay terlihat
        }
        refresh();
        root.setAttribute('data-live', 'true');
        wake();
      };
      const onDown = (e: PointerEvent) => { if (e.button === 0) { st.pressed = true; refresh(); } };
      const onUp = () => { if (st.pressed) { st.pressed = false; refresh(); } };
      const onHide = () => { st.pressed = false; root.setAttribute('data-live', 'false'); };
      const onOut = (e: MouseEvent) => { if (!e.relatedTarget) onHide(); };
      // Perubahan data-cursor / aria-busy / kelas tanpa pergerakan pointer.
      const mo = new MutationObserver(() => { if (st.seen) refresh(); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-cursor'] });
      mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-busy', 'disabled', 'data-cursor', 'class'] });

      document.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerover', onMove, { passive: true });
      document.addEventListener('pointerdown', onDown, { passive: true, capture: true });
      document.addEventListener('pointerup', onUp, { passive: true, capture: true });
      document.addEventListener('pointercancel', onUp, { passive: true, capture: true });
      document.documentElement.addEventListener('pointerleave', onHide);
      document.addEventListener('mouseout', onOut);
      window.addEventListener('blur', onHide);

      teardown = () => {
        if (st.raf) cancelAnimationFrame(st.raf);
        mo.disconnect();
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerover', onMove);
        document.removeEventListener('pointerdown', onDown, true);
        document.removeEventListener('pointerup', onUp, true);
        document.removeEventListener('pointercancel', onUp, true);
        document.documentElement.removeEventListener('pointerleave', onHide);
        document.removeEventListener('mouseout', onOut);
        window.removeEventListener('blur', onHide);
        document.documentElement.classList.remove('fc-hide-native');
        root.remove();
        tagRef.current = null;
        svgRef.current = null;
      };
    }

    function sync() {
      const want = fine.matches && !reduced.matches;
      if (want && !teardown) mount();
      else if (!want && teardown) { teardown(); teardown = null; }
    }

    sync();
    fine.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      fine.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
      if (teardown) teardown();
    };
  }, []);

  return null;
}
