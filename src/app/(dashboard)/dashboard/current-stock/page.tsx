import { createClient } from '@/lib/supabase/server';
import CurrentStockTable from './CurrentStockTable';

// Informasi stok saja (read-only): perubahan stok hanya lewat Stock Adjustment, Stock Transfer, atau transaksi lain.
export default async function CurrentStockPage() {
  const supabase = createClient();
  const [{ data: whs }, { data: prods }, { data: stock }, { data: transit }] = await Promise.all([
    supabase.from('warehouses').select('id, name').eq('is_active', true).order('created_at'),
    supabase.from('products').select('sku, name, brand, uom, category').eq('is_active', true).order('sku'),
    supabase.from('v_current_stock').select('warehouse_id, sku, qty'),
    supabase.from('stock_transfers').select('stock_transfer_items(sku, qty)').eq('status', 'SHIPPED'),
  ]);
  const onHand: Record<string, Record<string, number>> = {};
  (stock ?? []).forEach((s) => {
    const sku = s.sku as string;
    (onHand[sku] ??= {})[s.warehouse_id as string] = Number(s.qty);
  });
  const inTransit: Record<string, number> = {};
  (transit ?? []).forEach((t) => ((t.stock_transfer_items as unknown as { sku: string; qty: number }[]) ?? []).forEach((i) => { inTransit[i.sku] = (inTransit[i.sku] ?? 0) + Number(i.qty); }));

  // SKU yang punya catatan stok tetapi tidak ada di katalog aktif tetap ditampilkan.
  const known = new Set((prods ?? []).map((p) => p.sku as string));
  const extra = Object.keys(onHand).filter((s) => !known.has(s)).map((s) => ({ sku: s, name: '', brand: null, uom: '', category: null }));
  const products = [...(prods ?? []), ...extra].map((p) => ({ sku: p.sku as string, name: (p.name as string) ?? '', brand: (p.brand as string | null) ?? null, uom: (p.uom as string) ?? '', category: (p.category as string | null) ?? null }));

  return (
    <div>
      <h1 className="page-title"><i className="fa-solid fa-cubes" />Current Stock</h1>
      <p className="mb-6 text-sm text-slate-500">Informasi stok barang saat ini per gudang. Halaman ini hanya untuk melihat data; ubah stok lewat Stock Adjustment atau Stock Transfer.</p>
      <CurrentStockTable warehouses={whs ?? []} products={products} onHand={onHand} inTransit={inTransit} />
    </div>
  );
}
