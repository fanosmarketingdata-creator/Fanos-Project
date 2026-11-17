'use client';

import { useRouter } from 'next/navigation';
import { FullModal } from '@/components/registry/RegistryModal';

// Tampilan cetak sebagai modal layar penuh (sama seperti modal Create/Edit).
// Dokumen (.paper) tampil di tengah; tombol "Cetak" memanggil window.print() dan
// CSS @media print (lihat registry.css) menyembunyikan seluruh chrome modal
// sehingga hanya kertasnya yang tercetak.
export default function PrintModal({
  backHref,
  docNo,
  showPrint = true,
  children,
}: {
  backHref: string;
  docNo?: string | null;
  showPrint?: boolean; // false: dokumen sudah punya toolbar sendiri (opsi kertas dsb.)
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = () => router.push(backHref);
  return (
    <div className="print-modal">
      <FullModal
        title="Cetak"
        icon="fi fi-rr-print"
        onClose={close}
        footer={
          <>
            {docNo && <span data-no-i18n style={{ marginRight: 'auto', fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>{docNo}</span>}
            <button type="button" className="btn btn-secondary" onClick={close}>
              Tutup
            </button>
            {showPrint && (
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <i className="fi fi-rr-print" /> Cetak / Simpan PDF
              </button>
            )}
          </>
        }
      >
        {children}
      </FullModal>
    </div>
  );
}
