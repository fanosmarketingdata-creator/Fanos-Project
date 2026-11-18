'use client';

import { useRouter } from 'next/navigation';
import { FullModal } from '@/components/registry/RegistryModal';
import { BankProvider, BankSelect } from '@/components/BankInfo';

// Tampilan cetak sebagai modal layar penuh (sama seperti modal Create/Edit).
// Dokumen (.paper) tampil di tengah; tombol "Cetak" memanggil window.print() dan
// CSS @media print (lihat registry.css) menyembunyikan seluruh chrome modal
// sehingga hanya kertasnya yang tercetak.
export default function PrintModal({
  backHref,
  docNo,
  showPrint = true,
  split = false,
  showBank = true,
  bankKey,
  bankDefaultNone = false,
  children,
}: {
  backHref: string;
  docNo?: string | null;
  bankKey?: string; // pilihan rekening diingat terpisah per jenis dokumen
  bankDefaultNone?: boolean; // true: default "Tanpa rekening" (mis. Purchase Order)
  showBank?: boolean; // false: dokumen tanpa info rekening (Surat Jalan, Packing List)
  split?: boolean; // true: isi memenuhi modal (form kiri + pratinjau kanan, masing-masing scroll sendiri)
  showPrint?: boolean; // false: dokumen sudah punya toolbar sendiri (opsi kertas dsb.)
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = () => router.push(backHref);
  return (
    <BankProvider enabled={showBank} storageKey={bankKey} defaultNone={bankDefaultNone}>
    <div className={`print-modal ${split ? 'print-split' : ''}`}>
      <FullModal
        title="Cetak"
        icon="fi fi-rr-print"
        onClose={close}
        footer={
          <>
            {docNo && <span data-no-i18n style={{ marginRight: 'auto', fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>{docNo}</span>}
            {showBank && <BankSelect />}
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
    </BankProvider>
  );
}
