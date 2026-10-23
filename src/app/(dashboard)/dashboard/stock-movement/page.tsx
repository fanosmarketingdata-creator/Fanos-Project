import { createClient } from '@/lib/supabase/server';

const REF: Record<string, string> = { SALES_RETURN: 'Retur Penjualan' };

export default async function StockMovementPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('stock_movements')
    .select('id, move_date, sku, qty, ref_type, ref_no, notes, products(name)')
    .order('move_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-arrows-repeat" />Stock Movement</h1>
      <p className="mb-6 text-sm text-slate-500">Riwayat pergerakan stok. Saat ini mencatat barang masuk dari Return (Return Order / Return Invoice).</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Nama Produk</th>
              <th className="px-4 py-3 font-semibold">Jumlah</th>
              <th className="px-4 py-3 font-semibold">Sumber</th>
              <th className="px-4 py-3 font-semibold">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum terdapat pergerakan stok</td></tr>}
            {(data ?? []).map((m) => (
              <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-600">{new Date(m.move_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3 text-slate-700">{m.sku}</td>
                <td className="px-4 py-3 text-slate-600">{one<{ name: string }>(m.products)?.name ?? '-'}</td>
                <td className={`px-4 py-3 font-semibold ${Number(m.qty) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{Number(m.qty) >= 0 ? '+' : ''}{Number(m.qty)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{REF[m.ref_type] ?? m.ref_type} · {m.ref_no || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{m.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
