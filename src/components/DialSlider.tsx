'use client';

import { useEffect, useRef, useState } from 'react';

// Slider bergaya "dial" (penggaris): garis skala bergeser di bawah penanda merah di tengah.
// Bisa digeser (mouse/sentuh), diputar dengan scroll mouse (PC), atau lewat tombol panah keyboard.
export default function DialSlider({
  value, min, max, step = 1, onChange, unit = '', compact = false, label, className,
}: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
  unit?: string; compact?: boolean; label?: string; className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(220);
  const PX = compact ? 5 : 7; // piksel per 1 satuan
  const H = compact ? 26 : 38;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const latest = useRef({ value, onChange, clamp });
  latest.current = { value, onChange, clamp };
  const drag = useRef<{ x: number; v: number } | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 220));
    ro.observe(el);
    setW(el.clientWidth || 220);
    // Scroll mouse (PC): harus non-passive agar halaman tidak ikut tergulung saat kursor di atas dial.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY < 0 || e.deltaX < 0 ? 1 : -1;
      const { value: v, onChange: oc, clamp: c } = latest.current;
      const next = c(v + dir * step * (e.shiftKey ? 5 : 1));
      if (next !== v) oc(next);
    };
    // Scroll mouse berlaku di seluruh area dial (angka + skala).
    const host = outer.current ?? el;
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => { ro.disconnect(); host.removeEventListener('wheel', onWheel); };
  }, [step]);

  const cx = w / 2;
  const ticks: React.ReactNode[] = [];
  for (let v = min; v <= max; v += step) {
    const major = v % 10 === 0;
    const x = (v - min) * PX;
    ticks.push(<line key={v} x1={x} x2={x} y1={major ? H * 0.3 : H * 0.42} y2={major ? H * 0.9 : H * 0.8} stroke={major ? '#94a3b8' : '#cbd5e1'} strokeWidth={major ? 1.5 : 1} className={major ? 'dial-major' : 'dial-minor'} />);
  }

  return (
    <div ref={outer} className={className} style={{ userSelect: 'none' }}>
      <div style={{ textAlign: 'center', fontSize: compact ? 10 : 13, fontWeight: 600, lineHeight: 1.2 }} data-no-i18n>
        {label && <span style={{ opacity: 0.6, marginRight: 6, fontWeight: 500 }}>{label}</span>}{value}{unit ? ` ${unit}` : ''}
      </div>
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label || 'Ukuran'}
        title="Geser, atau scroll mouse"
        style={{ position: 'relative', height: H, cursor: 'ew-resize', touchAction: 'none', outline: 'none', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)' }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, v: value }; }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const next = clamp(drag.current.v - (e.clientX - drag.current.x) / PX);
          if (next !== value) onChange(next);
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + step)); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - step)); }
        }}
      >
        <svg width={w} height={H} style={{ display: 'block' }} aria-hidden>
          <g transform={`translate(${cx - (value - min) * PX},0)`}>{ticks}</g>
          <line x1={cx} x2={cx} y1={H * 0.12} y2={H * 0.95} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
