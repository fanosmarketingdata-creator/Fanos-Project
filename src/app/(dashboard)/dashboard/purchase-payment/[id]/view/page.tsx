import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function PurchasePaymentViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('purchase_payments')
    .select('id, doc_no, pay_date, amount, discount, method, reference_no, notes, purchase_invoices(doc_no, grand_total, remaining, vendors(company))')
    .eq('id', params.id)
    .single();
  if (!p) notFound();
  const inv = one<{ doc_no: string | null; grand_total: number; remaining: number; vendors: unknown }>(p.purchase_invoices);
  const rp = (n: unknown) => `Rp ${Math.round(Number(n ?? 0)).toLocaleString('id-ID')}`;
  return (
    <DetailShell title="Detail Purchase Payment" icon="fi fi-rr-wallet" backHref="/dashboard/purchase-payment" printHref={`/dashboard/purchase-payment/${p.id}/print`}>
      <DetailTop id={p.doc_no ?? 'Payment'} title={one<{ company: string }>(inv?.vendors)?.company ?? '-'} amountLabel="Jumlah Payment" amount={rp(p.amount)} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Payment', value: dateShort(p.pay_date) },
        { icon: 'fi fi-rr-file-invoice-dollar', label: 'Purchase Invoice', value: inv?.doc_no ?? '-' },
        { icon: 'fi fi-rr-credit-card', label: 'Metode', value: p.method || '-' },
        { icon: 'fi fi-rr-hastag', label: 'No. Referensi', value: p.reference_no || '-' },
      ]} />
      <DetailSummary rows={[
        { label: 'Total Invoice', value: rp(inv?.grand_total) },
        { label: 'Jumlah Payment', value: rp(p.amount) },
        { label: 'Total Discount', value: `- ${rp(p.discount)}`, kind: 'discount' },
        { label: 'Sisa Utang Invoice Saat Ini', value: rp(inv?.remaining), kind: 'grand' },
      ]} />
      {p.notes && <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Catatan: {p.notes}</p>}
    </DetailShell>
  );
}
