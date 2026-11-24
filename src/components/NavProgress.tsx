'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Indikator loading global: garis biru bercahaya di tepi bawah layar.
 * Mulai saat tautan internal diklik / riwayat berpindah, selesai ketika halaman baru tampil.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const [pct, setPct] = useState(0);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);

  function stopTimers() {
    if (timer.current) clearInterval(timer.current);
    if (safety.current) clearTimeout(safety.current);
    timer.current = null; safety.current = null;
  }
  function start() {
    if (active.current) return;
    active.current = true;
    stopTimers();
    setShow(true); setPct(8);
    timer.current = setInterval(() => setPct((p) => (p < 90 ? p + (90 - p) * 0.08 : p)), 180);
    safety.current = setTimeout(done, 15000);
  }
  function done() {
    if (!active.current) return;
    active.current = false;
    stopTimers();
    setPct(100);
    setTimeout(() => { setShow(false); setPct(0); }, 380);
  }

  // Halaman baru sudah tampil
  useEffect(() => { done(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      let u: URL;
      try { u = new URL(a.href, location.href); } catch { return; }
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search) return; // hanya hash/halaman sama
      start();
    };
    const onPop = () => start();
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPop);
    window.addEventListener('fanos:loading-start', start);
    window.addEventListener('fanos:loading-end', done);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('fanos:loading-start', start);
      window.removeEventListener('fanos:loading-end', done);
      stopTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`nav-progress${show ? ' on' : ''}`} aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
