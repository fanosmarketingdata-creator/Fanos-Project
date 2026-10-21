'use client';

import type { CSSProperties } from 'react';

// Input nominal rupiah: tampil "Rp 1.000.000" saat diketik, nilai yang dikirim berupa angka.
export default function RupiahInput({
  value, onValue, style, className, placeholder = 'Rp 0', autoFocus, disabled,
}: {
  value: number | string | null | undefined;
  onValue: (n: number) => void;
  style?: CSSProperties;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const n = Math.round(Number(value) || 0);
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={className}
      style={style}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      value={n ? 'Rp ' + n.toLocaleString('id-ID') : ''}
      onChange={(e) => onValue(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
    />
  );
}
