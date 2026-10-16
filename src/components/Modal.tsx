'use client';

import { useEffect } from 'react';

// Modal bersama untuk semua halaman, bergaya index.html (header biru).
// Judul yang diawali "Hapus"/"Konfirmasi" otomatis memakai varian merah
// (modal-delete) yang lebih kecil dan tidak full-screen di HP.
export default function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const danger = /^(hapus|konfirmasi|batalkan)/i.test(title.trim());

  return (
    <div
      className={`modal-overlay${danger ? ' modal-delete' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={danger ? { maxWidth: 480 } : undefined}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
