import type { SupabaseClient } from '@supabase/supabase-js';

export const REF_LABEL: Record<string, string> = {
  SALES_RETURN: 'Retur Penjualan',
  DELIVERY: 'Delivery Order',
  ADJUSTMENT: 'Stock Adjustment',
  TRANSFER_OUT: 'Transfer Keluar',
  TRANSFER_IN: 'Transfer Masuk',
  PURCHASE_RECEIPT: 'Penerimaan Barang',
};

export async function getDefaultWarehouseId(supabase: SupabaseClient) {
  const { data } = await supabase.from('warehouses').select('id').eq('is_active', true).order('is_default', { ascending: false }).order('created_at').limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

// Stok saat ini per SKU di satu gudang.
export async function getStockMap(supabase: SupabaseClient, warehouseId: string, skus?: string[]) {
  let q = supabase.from('v_current_stock').select('sku, qty').eq('warehouse_id', warehouseId);
  if (skus && skus.length) q = q.in('sku', skus);
  const { data } = await q;
  return new Map((data ?? []).map((r) => [r.sku as string, Number(r.qty)]));
}

export type MovementInput = { sku: string; qty: number; product_id?: string | null };

export async function postMovements(
  supabase: SupabaseClient,
  p: { warehouse_id: string; date: string; ref_type: string; ref_id: string; ref_no: string | null; reason?: string | null; notes?: string | null; items: MovementInput[] }
) {
  const rows = p.items.filter((i) => i.qty !== 0).map((i) => ({
    move_date: p.date, product_id: i.product_id ?? null, sku: i.sku, qty: i.qty,
    ref_type: p.ref_type, ref_id: p.ref_id, ref_no: p.ref_no, reason: p.reason ?? null, notes: p.notes ?? null, warehouse_id: p.warehouse_id,
  }));
  if (rows.length === 0) return {};
  const { error } = await supabase.from('stock_movements').insert(rows);
  return error ? { error: error.message } : {};
}
