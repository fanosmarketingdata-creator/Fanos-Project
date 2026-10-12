import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RecordPaymentButton from './RecordPaymentButton';

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: invoice }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from('invoices').select('*, clients(project_name, address, city)').eq('id', params.id).single(),
    supabase.from('invoice_items').select('sku, qty, unit_price, total, products(name)').eq('invoice_id', params.id),
    supabase.from('payments').select('id, pay_date, amount, method, reference_no, notes').eq('invoice_id', params.id).order('pay_date'),
  ]);

  if (!invoice) notFound();
  const client = invoice.clients as unknown as { project_name: string; address: string | null; city: string | null } | null;

  const statusBadge: Record<string, string> = {
    UNPAID: 'bg-red-100 text-red-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
    PAID: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div>
      <Link href="/dashboard/invoices" className="mb-3 inline-block text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Kembali ke daftar
      </Link>

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold text-slate-800">{client?.project_name ?? '-'}</h1>
          <p className="text-sm text-slate-500">
            {new Date(invoice.inv_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase ${statusBadge[invoice.status] || 'bg-slate-100 text-slate-600'}`}>
          {invoice.status}
        </span>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-4">
        <SummaryCard label="Grand Total" value={Number(invoice.grand_total)} />
        <SummaryCard label="Terbayar" value={Number(invoice.total_paid)} tone="emerald" />
        <SummaryCard label="Sisa Tagihan" value={Number(invoice.remaining)} tone={Number(invoice.remaining) > 0 ? 'red' : 'emerald'} />
      </div>

      <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-700">Item</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-semibold">SKU</th>
              <th className="px-4 py-2.5 font-semibold">Nama Produk</th>
              <th className="px-4 py-2.5 font-semibold">Qty</th>
              <th className="px-4 py-2.5 font-semibold">Harga</th>
              <th className="px-4 py-2.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{it.sku}</td>
                <td className="px-4 py-2.5 text-slate-600">{(it.products as unknown as { name: string } | null)?.name ?? '-'}</td>
                <td className="px-4 py-2.5 text-slate-600">{Number(it.qty)}</td>
                <td className="px-4 py-2.5 text-slate-600">Rp {Number(it.unit_price).toLocaleString('id-ID')}</td>
                <td className="px-4 py-2.5 text-slate-600">Rp {Number(it.total).toLocaleString('id-ID')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-700">Riwayat Pembayaran</h3>
          {invoice.status !== 'PAID' && <RecordPaymentButton invoiceId={invoice.id} />}
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-semibold">Tanggal</th>
              <th className="px-4 py-2.5 font-semibold">Jumlah</th>
              <th className="px-4 py-2.5 font-semibold">Metode</th>
              <th className="px-4 py-2.5 font-semibold">No. Referensi</th>
              <th className="px-4 py-2.5 font-semibold">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {(!payments || payments.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Belum ada pembayaran
                </td>
              </tr>
            )}
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2.5 text-slate-600">
                  {new Date(p.pay_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-2.5 font-medium text-slate-800">Rp {Number(p.amount).toLocaleString('id-ID')}</td>
                <td className="px-4 py-2.5 text-slate-600">{p.method || '-'}</td>
                <td className="px-4 py-2.5 text-slate-600">{p.reference_no || '-'}</td>
                <td className="px-4 py-2.5 text-slate-500">{p.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'red' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600' : tone === 'red' ? 'text-red-600' : 'text-slate-800';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${toneClass}`}>Rp {value.toLocaleString('id-ID')}</div>
    </div>
  );
}
