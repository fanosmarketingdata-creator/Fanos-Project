'use client';

import { useEffect } from 'react';

// Modal umum bergaya index.html: header biru bergradasi + tombol tutup bulat,
// body bisa di-scroll, footer di bawah. Modal dengan judul "Hapus ..." otomatis
// memakai header merah (padanan showDeleteConfirmation()). Gaya ada di
// styles/registry.css (.modal-overlay, .modal, .modal-header, ...).
export default function Modal({
  title,
  onClose,
  children,
  footer,
  maxWidth = 560,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const isDelete = /^(hapus|delete|batalkan)/i.test(title.trim());

  return (
    <div
      className={`modal-overlay${isDelete ? ' modal-delete' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth }}>
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
