import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { rupiah, dateShort } from '@/lib/format';
import { one } from '@/lib/print-helpers';

export default async function PurchasePaymentPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('purchase_payments')
    .select('id, doc_no, purchase_invoice_id, pay_date, amount, discount, method, reference_no, notes, created_at, purchase_invoices(doc_no, inv_date, grand_total, vendor_invoice_no, vendors(company, contact_name, address, phone))')
    .eq('id', params.id)
    .single();
  if (!p) notFound();
  const inv = one<{ doc_no: string | null; inv_date: string; grand_total: number; vendor_invoice_no: string | null; vendors: unknown }>(p.purchase_invoices);
  const v = one<{ company: string; contact_name: string | null; address: string | null; phone: string | null }>(inv?.vendors);
  const { data: all } = await supabase.from('purchase_payments').select('id, pay_date, created_at, amount, discount').eq('purchase_invoice_id', p.purchase_invoice_id);
  const before = (all ?? [])
    .filter((x) => x.id !== p.id && (x.pay_date < p.pay_date || (x.pay_date === p.pay_date && x.created_at < p.created_at)))
    .reduce((s, x) => s + Number(x.amount) + Number(x.discount ?? 0), 0);
  const grand = Number(inv?.grand_total ?? 0);
  const owing = grand - before - Number(p.amount) - Number(p.discount ?? 0);
  const lines = v ? [v.company, v.address, v.contact_name && `Up: ${v.contact_name}`, v.phone].filter(Boolean) as string[] : ['-'];

  return (
    <div>
      <PrintToolbar backHref={`/dashboard/purchase-payment/${p.id}/view`} docNo={p.doc_no} />
      <PrintDocument
        title="BUKTI PEMBAYARAN KE VENDOR"
        meta={[
          { label: 'Tgl Payment', value: dateShort(p.pay_date) },
          { label: 'No Payment', value: p.doc_no ?? '-' },
          { label: 'No Invoice', value: inv?.doc_no ?? '-' },
        ]}
        parties={[{ label: 'Dibayarkan Kepada,', lines }]}
        columns={[
          { key: 'inv', label: 'Invoice', width: '22%', align: 'left' },
          { key: 'vinv', label: 'Inv. Vendor', width: '18%', align: 'left' },
          { key: 'method', label: 'Metode', width: '16%', align: 'left' },
          { key: 'ref', label: 'No. Referensi', align: 'left' },
          { key: 'amount', label: 'Jumlah Payment', width: '20%', align: 'right' },
        ]}
        rows={[{ inv: inv?.doc_no ?? '-', vinv: inv?.vendor_invoice_no ?? '-', method: p.method ?? '-', ref: p.reference_no ?? '-', amount: rupiah(p.amount) }]}
        totals={[
          { label: 'Total Invoice:', value: rupiah(grand) },
          { label: 'Sudah Dibayar Sebelumnya:', value: rupiah(before) },
          { label: 'Jumlah Payment:', value: rupiah(p.amount) },
          { label: 'Total Discount:', value: `-${rupiah(p.discount)}` },
          { label: 'Sisa Utang:', value: rupiah(Math.max(owing, 0)), bold: true },
        ]}
        notes={p.notes ? [`Catatan: ${p.notes}`] : []}
        signatures={['Dibuat Oleh', 'Disetujui Oleh']}
      />
    </div>
  );
}
