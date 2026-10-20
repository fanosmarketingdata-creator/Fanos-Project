'use client';

import { useRouter } from 'next/navigation';
import { FullModal } from './RegistryModal';

// Pembungkus form tambah/edit dokumen: modal layar penuh seperti showModalFull() di index.html.
export default function DocFormShell({
  title,
  icon,
  backHref,
  saving,
  saveLabel = 'Simpan',
  onSave,
  children,
}: {
  title: string;
  icon: string;
  backHref: string;
  saving?: boolean;
  saveLabel?: string;
  onSave: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = () => router.push(backHref);
  return (
    <FullModal
      title={title}
      icon={icon}
      onClose={close}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
            <i className="fi fi-rr-disk" /> {saving ? 'Menyimpan...' : saveLabel}
          </button>
        </>
      }
    >
      {children}
    </FullModal>
  );
}

export function Sec({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="fv2-section">
      <div className="fv2-section-title">
        {icon && <i className={icon} />} {title}
      </div>
      {children}
    </div>
  );
}

export function TotalsBox({
  subtotal,
  discountPercent,
  discountAmount,
  chargeAmount,
  total,
  totalLabel = 'Total',
}: {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  chargeAmount: number;
  total: number;
  totalLabel?: string;
}) {
  const r = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  return (
    <div className="fv2-summary">
      <div className="dv2-summary-row"><span>Sub Total</span><span>{r(subtotal)}</span></div>
      <div className="dv2-summary-row discount"><span>Diskon ({discountPercent}%)</span><span>- {r(discountAmount)}</span></div>
      <div className="dv2-summary-row charge"><span>Biaya Tambahan</span><span>{r(chargeAmount)}</span></div>
      <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: '#1a237e' }}>
        <span>{totalLabel}</span>
        <span>{r(total)}</span>
      </div>
    </div>
  );
}
