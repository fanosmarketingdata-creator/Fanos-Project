import { createClient } from '@/lib/supabase/server';
import ReceiptTable from './ReceiptTable';

export default async function PurchaseDeliveryPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('purchase_deliveries')
    .select('id, doc_no, gr_date, vendor_do_no, purchase_orders(doc_no), vendors(company), warehouses(name), purchase_delivery_items(qty_received)')
    .order('gr_date', { ascending: false })
    .order('created_at', { ascending: false });
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (data ?? []).map((g) => {
    const items = (g.purchase_delivery_items as unknown as { qty_received: number }[]) ?? [];
    return {
      id: g.id as string, doc_no: (g.doc_no as string | null) ?? null, gr_date: g.gr_date as string, vendor_do_no: (g.vendor_do_no as string | null) ?? null,
      po_no: one<{ doc_no: string }>(g.purchase_orders)?.doc_no ?? '-', vendor: one<{ company: string }>(g.vendors)?.company ?? '-',
      warehouse: one<{ name: string }>(g.warehouses)?.name ?? '-', item_count: items.length, total_qty: items.reduce((s, i) => s + Number(i.qty_received), 0),
    };
  });
  return (
    <div>
      <h1 className="page-title"><i className="fa-solid fa-dolly" />Purchase Delivery</h1>
      <p className="mb-6 text-sm text-slate-500">Penerimaan barang dari vendor berdasarkan Purchase Order. Setiap penerimaan otomatis menambah stok dan tercatat di Stock Movement sebagai Goods Receipt.</p>
      <ReceiptTable rows={rows} />
    </div>
  );
}
