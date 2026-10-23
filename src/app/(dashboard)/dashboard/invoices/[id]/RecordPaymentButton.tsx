import Link from 'next/link';

// Pembayaran dicatat lewat menu Collection > Payment (invoice sudah terpilih).
export default function RecordPaymentButton({ invoiceId }: { invoiceId: string }) {
  return (
    <Link href={`/dashboard/payments/new?invoice=${invoiceId}`} className="fv2-add-btn" style={{ marginTop: 0 }}>
      <i className="fi fi-rr-plus" /> Catat Pembayaran
    </Link>
  );
}
