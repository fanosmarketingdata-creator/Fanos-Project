import { createClient } from '@/lib/supabase/server';
import TransferTable from './TransferTable';

export default async function StockTransferPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('stock_transfers')
    .select('id, doc_no, transfer_date, received_date, status, from:warehouses!stock_transfers_from_warehouse_id_fkey(name), to:warehouses!stock_transfers_to_warehouse_id_fkey(name), stock_transfer_items(qty)')
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false });
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (data ?? []).map((t) => {
    const items = (t.stock_transfer_items as unknown as { qty: number }[]) ?? [];
    return {
      id: t.id as string, doc_no: (t.doc_no as string | null) ?? null, transfer_date: t.transfer_date as string, received_date: (t.received_date as string | null) ?? null,
      status: t.status as string, from: one<{ name: string }>(t.from)?.name ?? '-', to: one<{ name: string }>(t.to)?.name ?? '-',
      item_count: items.length, total_qty: items.reduce((s, i) => s + Number(i.qty), 0),
    };
  });
  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-exchange" />Stock Transfer</h1>
      <p className="mb-6 text-sm text-slate-500">Pemindahan stok antar gudang dengan dua langkah: Gudang asal mengirim (Kirim), lalu Gudang tujuan menerima (Terima).</p>
      <TransferTable rows={rows} />
    </div>
  );
}
