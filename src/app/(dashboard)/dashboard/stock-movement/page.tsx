import { createClient } from '@/lib/supabase/server';
import StockMovementTable from './StockMovementTable';
import { orThrowAll } from '@/lib/query';

// Ledger stok (read-only): semua mutasi stok fisik mengalir ke sini otomatis.
export default async function StockMovementPage() {
  const supabase = createClient();
  const [{ data }, { data: whs }] = orThrowAll(await Promise.all([
    supabase
      .from('stock_movements')
      .select('id, move_date, sku, qty, ref_type, ref_no, reason, notes, warehouse_id, products(name)')
      .order('move_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3000),
    supabase.from('warehouses').select('id, name').order('created_at'),
  ]));
  const wname = new Map((whs ?? []).map((w) => [w.id as string, w.name as string]));
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (data ?? []).map((m) => ({
    id: m.id as string, date: m.move_date as string, sku: m.sku as string, name: one<{ name: string }>(m.products)?.name ?? '',
    qty: Number(m.qty), ref_type: m.ref_type as string, ref_no: (m.ref_no as string | null) ?? '', warehouse: wname.get(m.warehouse_id as string) ?? '-',
    reason: (m.reason as string | null) ?? '', notes: (m.notes as string | null) ?? '',
  }));
  return (
    <div>
      <StockMovementTable rows={rows} warehouses={(whs ?? []).map((w) => ({ id: w.name as string, name: w.name as string }))} />
    </div>
  );
}
