import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DetailShell from '@/components/registry/DetailShell';
import { DetailTop, DetailCards, DetailTableBlock, DetailSummary } from '@/components/registry/DocDetail';
import { dateShort, num } from '@/lib/format';
import { one } from '@/lib/print-helpers';

const rp = (n: unknown) => `Rp ${Number(n ?? 0).toLocaleString('id-ID')}`;

export default async function ReturnView({ id, kind }: { id: string; kind: 'order' | 'invoice' }) {
  const supabase = createClient();
  const [{ data: r }, { data: items }] = await Promise.all([
    supabase
      .from('sales_returns')
      .select('id, doc_no, return_date, reason, status, restock, settlement, clients(project_name), invoices(doc_no), credit_notes!credit_note_id(doc_no, amount, applied_amount, refunded_amount)')
      .eq('id', id)
      .single(),
    supabase.from('sales_return_items').select('sku, qty_returned, unit_price, subtotal, condition').eq('sales_return_id', id),
  ]);
  if (!r) notFound();
  const client = one<{ project_name: string }>(r.clients);
  const inv = one<{ doc_no: string | null }>(r.invoices);
  const cn = one<{ doc_no: string | null; amount: number; applied_amount: number; refunded_amount: number }>(r.credit_notes);
  const { data: prods } = await supabase.from('products').select('sku, name').in('sku', (items ?? []).map((i) => i.sku));
  const nameBy = new Map((prods ?? []).map((p) => [p.sku as string, p.name as string]));
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);
  const base = `/dashboard/returns/${kind}`;

  return (
    <DetailShell title={kind === 'order' ? 'Detail Return Order' : 'Detail Return Invoice'} icon={kind === 'order' ? 'fi fi-rr-undo' : 'fi fi-rr-receipt'} backHref={base} printHref={`${base}/${r.id}/print`}>
      <DetailTop id={r.doc_no ?? 'Return'} title={client?.project_name ?? '-'} badge={r.status} amountLabel="Nilai Retur" amount={rp(subtotal)} />
      <DetailCards cards={[
        { icon: 'fi fi-rr-calendar', label: 'Tanggal Retur', value: dateShort(r.return_date) },
        { icon: 'fi fi-rr-receipt', label: 'Invoice', value: inv?.doc_no ?? '-' },
        { icon: 'fi fi-rr-comment-alt', label: 'Alasan', value: r.reason || '-' },
        ...(kind === 'invoice' ? [{ icon: 'fi fi-rr-badge-percent', label: 'Credit Note', value: cn?.doc_no ?? '-' }] : [{ icon: 'fi fi-rr-boxes', label: 'Stok', value: 'Bertambah (kondisi Baik)' }]),
      ]} />
      <DetailTableBlock t={{
        title: 'Item Retur',
        columns: [{ label: 'No' }, { label: 'SKU', align: 'l' }, { label: 'Nama Produk', align: 'l' }, { label: 'Qty' }, ...(kind === 'order' ? [{ label: 'Kondisi' }] : []), { label: 'Harga', align: 'r' }, { label: 'Nilai', align: 'r' }],
        rows: (items ?? []).map((it, i) => [i + 1, it.sku, nameBy.get(it.sku) ?? '-', num(it.qty_returned), ...(kind === 'order' ? [it.condition] : []), rp(it.unit_price), rp(it.subtotal)]),
      }} />
      {kind === 'invoice' && cn && (
        <DetailSummary rows={[
          { label: 'Nilai Credit Note', value: rp(cn.amount), kind: 'grand' },
          { label: 'Dipotong ke Invoice', value: rp(cn.applied_amount) },
          { label: 'Direfund', value: rp(cn.refunded_amount) },
          { label: 'Saldo Kredit', value: rp(Number(cn.amount) - Number(cn.applied_amount) - Number(cn.refunded_amount)) },
        ]} />
      )}
    </DetailShell>
  );
}
