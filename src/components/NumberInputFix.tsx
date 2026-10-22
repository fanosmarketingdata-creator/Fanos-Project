'use client';

import { useEffect } from 'react';

// Semua input angka: isi otomatis terpilih saat difokus (ketik "1" langsung menggantikan "0"),
// dan angka nol di depan ("01") dihapus otomatis tanpa perlu hapus manual.
export default function NumberInputFix() {
  useEffect(() => {
    const isNum = (t: EventTarget | null): t is HTMLInputElement => t instanceof HTMLInputElement && t.type === 'number';

    const onFocus = (e: FocusEvent) => {
      if (!isNum(e.target)) return;
      const el = e.target;
      // Tunda sedikit supaya tidak dibatalkan oleh klik yang menaruh kursor.
      setTimeout(() => {
        if (document.activeElement === el) el.select();
      }, 0);
    };
    const onMouseUp = (e: MouseEvent) => {
      // Cegah klik pertama membatalkan seleksi.
      if (isNum(e.target) && document.activeElement === e.target && e.target.dataset.nfSel === '1') {
        e.preventDefault();
        e.target.dataset.nfSel = '0';
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (isNum(e.target) && document.activeElement !== e.target) e.target.dataset.nfSel = '1';
    };

    const onInput = (e: Event) => {
      if (!isNum(e.target)) return;
      const el = e.target;
      const v = el.value;
      const stripped = v.replace(/^(-?)0+(?=\d)/, '$1');
      if (stripped !== v) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, stripped);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    document.addEventListener('focusin', onFocus);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('input', onInput, true);
    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.removeEventListener('input', onInput, true);
    };
  }, []);
  return null;
}
