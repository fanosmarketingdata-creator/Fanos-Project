import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary, buildSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';
import RecordPaymentButton from './RecordPaymentButton';

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: invoice }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from('invoices').select('*, clients(project_name, address, city)').eq('id', params.id).single(),
    supabase.from('invoice_items').select('sku, qty, unit_price, total, products(name)').eq('invoice_id', params.id),
    supabase.from('payments').select('id, doc_no, pay_date, amount, discount, method, reference_no, notes').eq('invoice_id', params.id).order('pay_date'),
  ]);
  if (!invoice) notFound();
  const client = one<{ project_name: string; address: string | null; city: string | null }>(invoice.clients);
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.total), 0);
  const { rows } = buildSummary(subtotal, invoice.discounts ?? [], invoice.charges ?? [], 'Grand Total');
  const rp = (n: unknown) => `Rp ${Number(n ?? 0).toLocaleString('id-ID')}`;

  return (
    <DetailShell title="Detail Invoice" icon="fi fi-rr-receipt" backHref="/dashboard/invoices" printHref={`/dashboard/invoices/${invoice.id}/print`}>
      <DetailTop id={invoice.doc_no ?? 'Invoice'} title={client?.project_name ?? '-'} badge={invoice.status} amountLabel="Grand Total" amount={rp(invoice.grand_total)} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Invoice', value: dateShort(invoice.inv_date) },
        { icon: 'fi fi-rr-marker', label: 'Alamat', value: [client?.address, client?.city].filter(Boolean).join(', ') || '-' },
        { icon: 'fi fi-rr-check', label: 'Terbayar', value: rp(Number(invoice.total_paid) + Number(invoice.paid_discount ?? 0) + Number(invoice.credit_applied ?? 0)), color: '#16a34a' },
        { icon: 'fi fi-rr-time-quarter-past', label: 'Sisa Tagihan', value: rp(invoice.remaining), color: Number(invoice.remaining) > 0 ? '#dc2626' : '#16a34a' },
      ]} />
      <DetailTableBlock t={{
        title: 'Daftar Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Qty' }, { label: 'Harga', align: 'r' }, { label: 'Total', align: 'r' }],
        rows: (items ?? []).map((it, i) => [i + 1, it.sku, one<{ name: string }>(it.products)?.name ?? '-', num(it.qty), rp(it.unit_price), rp(it.total)]),
      }} />
      <DetailSummary rows={rows} />

      <div className="dv2-section-title" style={{ justifyContent: 'space-between' }}>
        <span><i className="fi fi-rr-wallet" /> Riwayat Pembayaran</span>
        {invoice.status !== 'PAID' && <RecordPaymentButton invoiceId={invoice.id} />}
      </div>
      <DetailTableBlock t={{
        title: 'Pembayaran',
        icon: 'fi fi-rr-money',
        columns: [{ label: 'Payment ID' }, { label: 'Tanggal' }, { label: 'Jumlah', align: 'r' }, { label: 'Total Discount', align: 'r' }, { label: 'Metode' }, { label: 'No. Referensi' }, { label: 'Catatan', align: 'l' }],
        rows: (payments ?? []).map((p) => [p.doc_no || '-', dateShort(p.pay_date), rp(p.amount), rp(p.discount), p.method || '-', p.reference_no || '-', p.notes || '-']),
        empty: 'Belum terdapat data pembayaran',
      }} />
    </DetailShell>
  );
}
