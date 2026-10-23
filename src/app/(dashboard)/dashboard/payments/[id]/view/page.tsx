import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function PaymentViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('payments')
    .select('id, doc_no, pay_date, amount, discount, method, reference_no, notes, invoice_id, invoices(doc_no, grand_total, total_paid, paid_discount, remaining, clients(project_name))')
    .eq('id', params.id)
    .single();
  if (!p) notFound();
  const inv = one<{ doc_no: string | null; grand_total: number; total_paid: number; paid_discount: number; remaining: number; clients: unknown }>(p.invoices);
  const client = one<{ project_name: string }>(inv?.clients);
  const rp = (n: unknown) => `Rp ${Number(n ?? 0).toLocaleString('id-ID')}`;

  return (
    <DetailShell title="Detail Payment" icon="fi fi-rr-money-bill-wave" backHref="/dashboard/payments" printHref={`/dashboard/payments/${p.id}/print`} editHref={`/dashboard/payments/${p.id}`}>
      <DetailTop id={p.doc_no ?? 'Payment'} title={client?.project_name ?? '-'} amountLabel="Jumlah Payment" amount={rp(p.amount)} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Payment', value: dateShort(p.pay_date) },
        { icon: 'fi fi-rr-receipt', label: 'Invoice', value: inv?.doc_no ?? '-' },
        { icon: 'fi fi-rr-credit-card', label: 'Metode', value: p.method || '-' },
        { icon: 'fi fi-rr-hastag', label: 'No. Referensi', value: p.reference_no || '-' },
      ]} />
      <DetailSummary rows={[
        { label: 'Total Invoice', value: rp(inv?.grand_total) },
        { label: 'Jumlah Payment', value: rp(p.amount) },
        { label: 'Total Discount', value: `- ${rp(p.discount)}`, kind: 'discount' },
        { label: 'Owing Invoice Saat Ini', value: rp(inv?.remaining), kind: 'grand' },
      ]} />
      {p.notes && <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>Catatan: {p.notes}</p>}
    </DetailShell>
  );
}
