import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintDocument from '@/components/PrintDocument';
import PrintToolbar from '@/components/PrintToolbar';
import { rupiah, dateShort } from '@/lib/format';
import { clientLines, one, type PrintClient } from '@/lib/print-helpers';

export default async function PaymentPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from('payments')
    .select('id, doc_no, invoice_id, pay_date, amount, discount, method, reference_no, notes, created_at, invoices(doc_no, inv_date, grand_total, clients(project_name, company, contact_name, address, city, phone))')
    .eq('id', params.id)
    .single();
  if (!p) notFound();
  const inv = one<{ doc_no: string | null; inv_date: string; grand_total: number; clients: unknown }>(p.invoices);

  // Pembayaran lain pada invoice yang sama yang terjadi sebelum payment ini.
  const { data: all } = await supabase.from('payments').select('id, pay_date, created_at, amount, discount').eq('invoice_id', p.invoice_id);
  const before = (all ?? [])
    .filter((x) => x.id !== p.id && (x.pay_date < p.pay_date || (x.pay_date === p.pay_date && x.created_at < p.created_at)))
    .reduce((s, x) => s + Number(x.amount) + Number(x.discount ?? 0), 0);
  const grand = Number(inv?.grand_total ?? 0);
  const owing = grand - before - Number(p.amount) - Number(p.discount ?? 0);

  return (
    <div>
      <PrintToolbar backHref={`/dashboard/payments/${p.id}/view`} docNo={p.doc_no} />
      <PrintDocument
        title="BUKTI PEMBAYARAN"
        meta={[
          { label: 'Tgl Payment', value: dateShort(p.pay_date) },
          { label: 'No Payment', value: p.doc_no ?? '-' },
          { label: 'No Invoice', value: inv?.doc_no ?? '-' },
        ]}
        parties={[{ label: 'Diterima Dari,', lines: clientLines(one<PrintClient>(inv?.clients)) }]}
        columns={[
          { key: 'inv', label: 'Invoice', width: '22%', align: 'left' },
          { key: 'date', label: 'Tgl Invoice', width: '16%', align: 'center' },
          { key: 'method', label: 'Metode', width: '18%', align: 'left' },
          { key: 'ref', label: 'No. Referensi', align: 'left' },
          { key: 'amount', label: 'Jumlah Payment', width: '20%', align: 'right' },
        ]}
        rows={[{ inv: inv?.doc_no ?? '-', date: dateShort(inv?.inv_date), method: p.method ?? '-', ref: p.reference_no ?? '-', amount: rupiah(p.amount) }]}
        totals={[
          { label: 'Total Invoice:', value: rupiah(grand) },
          { label: 'Sudah Dibayar Sebelumnya:', value: rupiah(before) },
          { label: 'Jumlah Payment:', value: rupiah(p.amount) },
          { label: 'Total Discount:', value: `-${rupiah(p.discount)}` },
          { label: 'Owing (Sisa Tagihan):', value: rupiah(Math.max(owing, 0)), bold: true },
        ]}
        notes={p.notes ? [`Catatan: ${p.notes}`] : []}
        signatures={['Diterima Oleh', 'Disetujui Oleh']}
      />
    </div>
  );
}
