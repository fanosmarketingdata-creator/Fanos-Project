import { createClient } from '@/lib/supabase/server';
import AdjustmentTable from './AdjustmentTable';

export default async function StockAdjustmentPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('stock_adjustments')
    .select('id, doc_no, adj_date, adj_type, reason, warehouses(name), stock_adjustment_items(diff)')
    .order('adj_date', { ascending: false })
    .order('created_at', { ascending: false });
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (data ?? []).map((a) => {
    const items = (a.stock_adjustment_items as unknown as { diff: number }[]) ?? [];
    return {
      id: a.id as string, doc_no: (a.doc_no as string | null) ?? null, adj_date: a.adj_date as string, adj_type: a.adj_type as string, reason: a.reason as string,
      warehouse: one<{ name: string }>(a.warehouses)?.name ?? '-', item_count: items.length, net: items.reduce((s, i) => s + Number(i.diff), 0),
    };
  });
  return (
    <div>
      <AdjustmentTable rows={rows} />
    </div>
  );
}
