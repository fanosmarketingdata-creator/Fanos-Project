'use client';

import { useEffect } from 'react';

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

// Modal form biru (showModal() di index.html).
export function FormModal({
  title,
  icon,
  onClose,
  footer,
  children,
  maxWidth,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  useEscape(onClose);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-header">
          <h3>
            <i className={icon} /> {title}
          </h3>
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

// Modal layar penuh (showModalFull() di index.html) — dipakai form tambah/edit & detail dokumen.
export function FullModal({
  title,
  icon,
  onClose,
  footer,
  children,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="modal-overlay modal-full-overlay">
      <div className="modal modal-full" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h3>
            <i className={icon} /> {title}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-inner">{children}</div>
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Modal detail (showModalDetail()).
export function DetailModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEscape(onClose);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 550 }}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-eye" /> {title}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="modal-body modal-body-detail">
          {children}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal konfirmasi hapus merah (showDeleteConfirmation()).
export function DeleteModal({
  title,
  itemName,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  itemName: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  return (
    <div className="modal-overlay modal-delete" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>
            <i className="fi fi-rr-trash" /> {title}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: 24 }}>
          <div className="modal-icon">
            <i className="fi fi-rr-trash" />
          </div>
          <div className="modal-title">Apakah Anda yakin ingin menghapus data ini?</div>
          <div className="modal-subtitle">Anda akan menghapus:</div>
          <div className="modal-item-id">{itemName}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>Tindakan ini tidak dapat dibatalkan.</div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
            <i className="fi fi-rr-trash" /> {busy ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Kartu info kecil di modal detail (dv2Card()).
export function DvCard({ icon, label, value, color }: { icon: string; label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="dv2-card">
      <div className="dv2-card-icon" style={color ? { background: `${color}1a`, color } : undefined}>
        <i className={icon} />
      </div>
      <div>
        <div className="dv2-card-label">{label}</div>
        <div className="dv2-card-value">{value}</div>
      </div>
    </div>
  );
}

// Field form (fv2-field).
export function FvField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fv2-field">
      <label>
        {label} {required && <span className="req">*</span>}
      </label>
      {children}
    </div>
  );
}
