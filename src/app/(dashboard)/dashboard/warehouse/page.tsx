import { createClient } from '@/lib/supabase/server';
import WarehouseTable, { type WarehouseRow } from './WarehouseTable';
import { orThrowAll } from '@/lib/query';

export default async function WarehousePage() {
  const supabase = createClient();
  const [{ data: whs }, { data: stock }] = orThrowAll(await Promise.all([
    supabase.from('warehouses').select('id, code, name, address, is_default, is_active').order('created_at'),
    supabase.from('v_current_stock').select('warehouse_id, qty'),
  ]));
  const total = new Map<string, number>();
  (stock ?? []).forEach((s) => total.set(s.warehouse_id as string, (total.get(s.warehouse_id as string) ?? 0) + Number(s.qty)));
  const rows: WarehouseRow[] = (whs ?? []).map((w) => ({ id: w.id, code: w.code, name: w.name, address: w.address, is_default: w.is_default, is_active: w.is_active, total_qty: total.get(w.id) ?? 0 }));
  return <WarehouseTable initialRows={rows} />;
}
