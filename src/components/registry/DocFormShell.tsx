'use client';

import { useRouter } from 'next/navigation';
import { FullModal } from './RegistryModal';

// Pembungkus form tambah/edit dokumen: modal layar penuh seperti showModalFull() di index.html.
export default function DocFormShell({
  title,
  icon,
  backHref,
  saving,
  disabled,
  saveLabel = 'Simpan',
  onSave,
  children,
}: {
  title: string;
  icon: string;
  backHref: string;
  saving?: boolean;
  disabled?: boolean; // tombol simpan nonaktif (belum lengkap) tanpa tampil "Menyimpan..."
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
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving || disabled}>
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
  taxPercent = 0,
  taxAmount = 0,
  chargeAmount,
  total,
  totalLabel = 'Total',
  discounts,
  charges,
}: {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent?: number;
  taxAmount?: number;
  chargeAmount: number;
  total: number;
  totalLabel?: string;
  // Bila diisi, setiap diskon / pajak / biaya tampil sebagai baris sendiri (tidak diakumulasi).
  discounts?: { label: string; percent: number; kind?: string }[];
  charges?: { label: string; amount: number }[];
}) {
  const r = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  return (
    <div className="fv2-summary">
      <div className="dv2-summary-row"><span>Sub Total</span><span>{r(subtotal)}</span></div>
      {discounts || charges ? (
        <>
          {(discounts ?? []).filter((d) => d.kind !== 'tax').map((d, i) => (
            <div key={'d' + i} className="dv2-summary-row discount"><span>Diskon{d.label ? ' ' + d.label : ''} ({d.percent || 0}%)</span><span>- {r((subtotal * (d.percent || 0)) / 100)}</span></div>
          ))}
          {(discounts ?? []).filter((d) => d.kind === 'tax').map((d, i) => (
            <div key={'t' + i} className="dv2-summary-row charge"><span>Pajak{d.label ? ' ' + d.label : ''} ({d.percent || 0}%)</span><span>+ {r(((subtotal - discountAmount) * (d.percent || 0)) / 100)}</span></div>
          ))}
          {(charges ?? []).map((c, i) => (
            <div key={'c' + i} className="dv2-summary-row charge"><span>{c.label || 'Biaya Tambahan'}</span><span>{r(c.amount || 0)}</span></div>
          ))}
        </>
      ) : (
        <>
          <div className="dv2-summary-row discount"><span>Diskon ({discountPercent}%)</span><span>- {r(discountAmount)}</span></div>
          {taxPercent > 0 && <div className="dv2-summary-row charge"><span>Pajak ({taxPercent}%)</span><span>+ {r(taxAmount)}</span></div>}
          <div className="dv2-summary-row charge"><span>Biaya Tambahan</span><span>{r(chargeAmount)}</span></div>
        </>
      )}
      <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: '#1a237e' }}>
        <span>{totalLabel}</span>
        <span>{r(total)}</span>
      </div>
    </div>
  );
}
