import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function PurchaseInvoiceViewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: inv }, { data: items }, { data: pays }] = await Promise.all([
    supabase.from('purchase_invoices').select('id, doc_no, inv_date, due_date, vendor_invoice_no, status, discount_percent, tax_percent, subtotal, grand_total, total_paid, paid_discount, remaining, notes, vendors(company), purchase_orders(doc_no)').eq('id', params.id).single(),
    supabase.from('purchase_invoice_items').select('sku, description, qty, uom, unit_price, total').eq('purchase_invoice_id', params.id).order('sort_order'),
    supabase.from('purchase_payments').select('doc_no, pay_date, amount, discount, method').eq('purchase_invoice_id', params.id).order('pay_date'),
  ]);
  if (!inv) notFound();
  const rp = (n: unknown) => `Rp ${Math.round(Number(n ?? 0)).toLocaleString('id-ID')}`;
  const sub = Number(inv.subtotal);
  const disc = (sub * Number(inv.discount_percent)) / 100;
  const tax = ((sub - disc) * Number(inv.tax_percent)) / 100;
  return (
    <DetailShell title="Detail Purchase Invoice" icon="fi fi-rr-file-invoice-dollar" backHref="/dashboard/purchase-invoice">
      <DetailTop id={inv.doc_no ?? 'Purchase Invoice'} title={one<{ company: string }>(inv.vendors)?.company ?? '-'} badge={inv.status} amountLabel="Sisa Utang" amount={rp(inv.remaining)} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Invoice', value: dateShort(inv.inv_date) },
        { icon: 'fi fi-rr-calendar-clock', label: 'Jatuh Tempo', value: inv.due_date ? dateShort(inv.due_date) : '-' },
        { icon: 'fi fi-rr-file-invoice', label: 'Purchase Order', value: one<{ doc_no: string }>(inv.purchase_orders)?.doc_no ?? '-' },
        { icon: 'fi fi-rr-hastag', label: 'No. Invoice Vendor', value: inv.vendor_invoice_no || '-' },
      ]} />
      <DetailTableBlock t={{
        title: 'Daftar Item',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Deskripsi', align: 'l' }, { label: 'Qty' }, { label: 'Satuan' }, { label: 'Harga Beli', align: 'r' }, { label: 'Total', align: 'r' }],
        rows: (items ?? []).map((it, i) => [i + 1, it.sku, it.description ?? '', num(it.qty), it.uom ?? '', rp(it.unit_price), rp(it.total)]),
      }} />
      {(pays ?? []).length > 0 && (
        <DetailTableBlock t={{
          title: 'Riwayat Pembayaran',
          columns: [{ label: 'No' }, { label: 'Payment ID', align: 'l' }, { label: 'Tanggal' }, { label: 'Metode', align: 'l' }, { label: 'Jumlah', align: 'r' }, { label: 'Diskon', align: 'r' }],
          rows: (pays ?? []).map((p, i) => [i + 1, p.doc_no ?? '-', dateShort(p.pay_date), p.method ?? '-', rp(p.amount), rp(p.discount)]),
        }} />
      )}
      <DetailSummary rows={[
        { label: 'Sub Total', value: rp(sub) },
        { label: `Diskon (${inv.discount_percent}%)`, value: `- ${rp(disc)}`, kind: 'discount' },
        { label: `Pajak (${inv.tax_percent}%)`, value: rp(tax), kind: 'charge' },
        { label: 'Grand Total', value: rp(inv.grand_total) },
        { label: 'Sudah Dibayar', value: rp(inv.total_paid) },
        { label: 'Diskon Pembayaran', value: `- ${rp(inv.paid_discount)}`, kind: 'discount' },
        { label: 'Sisa Utang', value: rp(inv.remaining), kind: 'grand' },
      ]} />
    </DetailShell>
  );
}
