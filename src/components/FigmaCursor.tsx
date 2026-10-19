'use client';

import { useEffect, useRef } from 'react';

// Kursor pendamping bergaya multiplayer (panah + tag nama). Bersifat tambahan:
// kursor sistem tetap tampil, overlay tidak menangkap klik/hover/fokus, dan efek
// tidak dipasang bila pengguna memilih gerak dikurangi atau perangkat tanpa pointer halus.

const SIZE = 22;
const RADIUS = 1.75;
const FOLLOW = 0.34;
const DX = 14;
const DY = 18;
const COLOUR = '#5B9BF6';
const INTERACTIVE = 'a, button, input';
const SVGNS = 'http://www.w3.org/2000/svg';
const ARROW: [number, number][] = [[1, 1], [1, 16.6], [5.2, 12.9], [8.2, 19.8], [11.3, 18.5], [8.4, 11.7], [13.8, 11.7]];

function roundedPath(pts: [number, number][], r: number) {
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

export default function FigmaCursor({ name = 'you' }: { name?: string }) {
  const nameRef = useRef(name);
  nameRef.current = name;
  const tagRef = useRef<HTMLDivElement | null>(null);

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
      svg.setAttribute('viewBox', '0 0 22 22');
      svg.setAttribute('width', String(SIZE));
      svg.setAttribute('height', String(SIZE));
      svg.style.left = `${-1 * s}px`;
      svg.style.top = `${-1 * s}px`;
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', roundedPath(ARROW, RADIUS));
      path.setAttribute('fill', COLOUR);
      path.setAttribute('stroke', '#ffffff');
      path.setAttribute('stroke-width', '1.25');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);

      const tag = document.createElement('div');
      tag.className = 'fc-tag';
      tag.textContent = nameRef.current || 'you';
      tag.style.background = COLOUR;
      tag.style.color = '#0d0d0d';
      tag.style.left = `${9.6 * s + 5}px`;
      tag.style.top = `${18.6 * s + 1}px`;
      tagRef.current = tag;

      inner.appendChild(svg);
      inner.appendChild(tag);
      root.appendChild(inner);
      document.body.appendChild(root);

      const st = { x: 0, y: 0, tx: 0, ty: 0, seen: false, raf: 0, last: 0 };

      const frame = (now: number) => {
        const dt = st.last ? Math.min(now - st.last, 64) : 16.7;
        st.last = now;
        const k = 1 - Math.pow(1 - FOLLOW, dt / 16.667);
        st.x += (st.tx - st.x) * k;
        st.y += (st.ty - st.y) * k;
        root.style.transform = `translate3d(${st.x.toFixed(2)}px,${st.y.toFixed(2)}px,0)`;
        if (Math.abs(st.tx - st.x) < 0.05 && Math.abs(st.ty - st.y) < 0.05) {
          st.x = st.tx; st.y = st.ty; st.raf = 0; st.last = 0; // diam sampai pointer bergerak lagi
          root.style.transform = `translate3d(${st.x}px,${st.y}px,0)`;
          return;
        }
        st.raf = requestAnimationFrame(frame);
      };
      const wake = () => { if (!st.raf) st.raf = requestAnimationFrame(frame); };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        st.tx = e.clientX + DX;
        st.ty = e.clientY + DY;
        if (!st.seen) { st.seen = true; st.x = st.tx; st.y = st.ty; }
        root.setAttribute('data-live', 'true');
        const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
        root.setAttribute('data-hot', el ? 'true' : 'false');
        wake();
      };
      const onHide = () => root.setAttribute('data-live', 'false');
      const onOut = (e: MouseEvent) => { if (!e.relatedTarget) onHide(); };

      document.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerover', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onHide);
      document.addEventListener('mouseout', onOut);
      window.addEventListener('blur', onHide);

      teardown = () => {
        if (st.raf) cancelAnimationFrame(st.raf);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerover', onMove);
        document.documentElement.removeEventListener('pointerleave', onHide);
        document.removeEventListener('mouseout', onOut);
        window.removeEventListener('blur', onHide);
        root.remove();
        tagRef.current = null;
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
