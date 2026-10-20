'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FullModal } from './RegistryModal';

// Modal detail layar penuh (showModalFull + dv2 di index.html) untuk dokumen.
export default function DetailShell({
  title,
  icon,
  backHref,
  printHref,
  editHref,
  children,
}: {
  title: string;
  icon: string;
  backHref: string;
  printHref?: string;
  editHref?: string;
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
          {printHref && (
            <Link href={printHref} className="btn btn-print">
              <i className="fi fi-rr-print" /> Cetak
            </Link>
          )}
          {editHref && (
            <Link href={editHref} className="btn btn-primary">
              <i className="fi fi-rr-edit" /> Edit
            </Link>
          )}
          <button type="button" className="btn btn-secondary" onClick={close}>
            Tutup
          </button>
        </>
      }
    >
      <div className="dv2">{children}</div>
    </FullModal>
  );
}
