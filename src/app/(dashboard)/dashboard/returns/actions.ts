'use server';

import { getDefaultWarehouseId } from '@/lib/stock';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncInvoicePayments } from '@/lib/invoice-sync';
import { sumDiscountPercent, sumTaxPercent, type DiscountLine } from '@/lib/discount-charge';

type Sb = ReturnType<typeof createClient>;

function refresh() {
  ['returns/order', 'returns/invoice', 'credit-notes', 'invoices', 'outstanding', 'payments', 'stock-movement'].forEach((p) => revalidatePath('/dashboard/' + p));
}

// Invoice sales yang sudah terbit.
export async function getInvoicesForReturn() {
  const supabase = createClient();
  const { data } = await supabase
    .from('invoices')
    .select('id, doc_no, inv_date, grand_total, remaining, clients(project_name)')
    .order('inv_date', { ascending: false });
  return (data ?? []).map((inv) => ({
    remaining: Number(inv.remaining),
    id: inv.id as string,
    doc_no: (inv.doc_no as string | null) ?? null,
    inv_date: inv.inv_date as string,
    grand_total: Number(inv.grand_total),
    client_name: (inv.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));
}

// Qty yang sudah diretur per SKU pada invoice ini, menurut jenis retur.
async function returnedBySku(supabase: Sb, invoiceId: string, kind: 'ORDER' | 'INVOICE', onlyOrderId?: string) {
  let q = supabase.from('sales_returns').select('id, return_order_id, sales_return_items(sku, qty_returned)').eq('invoice_id', invoiceId).eq('kind', kind);
  if (onlyOrderId) q = q.eq('return_order_id', onlyOrderId);
  const { data } = await q;
  const m = new Map<string, number>();
  (data ?? []).forEach((r) => {
    ((r.sales_return_items as unknown as { sku: string; qty_returned: number }[]) ?? []).forEach((ri) => {
      m.set(ri.sku, (m.get(ri.sku) ?? 0) + Number(ri.qty_returned));
    });
  });
  return m;
}

export type ReturnableItem = {
  sku: string; name: string; invoiced: number; returned: number; returnable: number; unit_price: number;
};

// Item invoice + sisa qty yang masih boleh diretur.
// Return Order: batas = qty invoice - total Return Order sebelumnya.
// Return Invoice: batas = qty invoice - total Return Invoice sebelumnya (dan, bila dari Return Order, qty order yang belum dikreditkan).
export async function getReturnableItems(invoiceId: string, kind: 'ORDER' | 'INVOICE' = 'ORDER', orderId?: string) {
  const supabase = createClient();
  const [{ data: invItems }, done, orderQty, orderDone] = await Promise.all([
    supabase.from('invoice_items').select('sku, qty, unit_price, products(name)').eq('invoice_id', invoiceId),
    returnedBySku(supabase, invoiceId, kind),
    orderId ? orderItems(supabase, orderId) : Promise.resolve(null),
    orderId ? returnedBySku(supabase, invoiceId, 'INVOICE', orderId) : Promise.resolve(null),
  ]);

  return (invItems ?? [])
    .map((it) => {
      const sku = it.sku as string;
      const already = done.get(sku) ?? 0;
      let returnable = Number(it.qty) - already;
      if (orderQty) returnable = Math.min(returnable, (orderQty.get(sku) ?? 0) - (orderDone?.get(sku) ?? 0));
      return {
        sku,
        name: (it.products as unknown as { name: string } | null)?.name ?? '',
        invoiced: Number(it.qty),
        returned: already,
        returnable: Math.max(0, returnable),
        unit_price: Number(it.unit_price),
      } as ReturnableItem;
    })
    .filter((it) => !orderQty || (orderQty.get(it.sku) ?? 0) > 0);
}

async function orderItems(supabase: Sb, orderId: string) {
  const { data } = await supabase.from('sales_return_items').select('sku, qty_returned').eq('sales_return_id', orderId);
  const m = new Map<string, number>();
  (data ?? []).forEach((r) => m.set(r.sku as string, (m.get(r.sku as string) ?? 0) + Number(r.qty_returned)));
  return m;
}

// Return Order milik invoice ini yang masih punya qty belum dikreditkan.
export async function getOrdersForInvoice(invoiceId: string) {
  const supabase = createClient();
  const { data: orders } = await supabase.from('sales_returns').select('id, doc_no, return_date').eq('invoice_id', invoiceId).eq('kind', 'ORDER').order('return_date', { ascending: false });
  const out: { id: string; doc_no: string | null; return_date: string }[] = [];
  for (const o of orders ?? []) {
    const [qty, done] = await Promise.all([orderItems(supabase, o.id), returnedBySku(supabase, invoiceId, 'INVOICE', o.id)]);
    let left = 0;
    qty.forEach((q, sku) => { left += q - (done.get(sku) ?? 0); });
    if (left > 0) out.push({ id: o.id, doc_no: o.doc_no ?? null, return_date: o.return_date });
  }
  return out;
}

// Faktor diskon & pajak invoice: Credit Note mengembalikan nilai barang + pajak dikurangi diskon (proporsional).
export async function getInvoiceFactor(invoiceId: string) {
  const supabase = createClient();
  const { data: inv } = await supabase.from('invoices').select('discounts').eq('id', invoiceId).single();
  const lines = ((inv?.discounts ?? []) as DiscountLine[]);
  const d = sumDiscountPercent(lines) / 100;
  const t = sumTaxPercent(lines) / 100;
  return { discountPercent: d * 100, taxPercent: t * 100, factor: (1 - d) * (1 + t) };
}

export type ReturnItemInput = { sku: string; qty_returned: number; unit_price: number; condition?: string };

async function addStock(supabase: Sb, retId: string, refNo: string | null, date: string, items: ReturnItemInput[], note: string, warehouseId?: string) {
  const skus = items.map((i) => i.sku);
  const { data: prods } = await supabase.from('products').select('id, sku').in('sku', skus);
  const idBySku = new Map((prods ?? []).map((p) => [p.sku as string, p.id as string]));
  const wh = warehouseId || (await getDefaultWarehouseId(supabase));
  const rows = items.map((i) => ({
    warehouse_id: wh, reason: 'Retur Penjualan', move_date: date, product_id: idBySku.get(i.sku) ?? null, sku: i.sku, qty: i.qty_returned,
    ref_type: 'SALES_RETURN', ref_id: retId, ref_no: refNo, notes: note,
  }));
  if (rows.length === 0) return {};
  const { error } = await supabase.from('stock_movements').insert(rows);
  return error ? { error: error.message } : {};
}

async function loadInvoice(supabase: Sb, invoiceId: string) {
  const { data } = await supabase.from('invoices').select('id, client_id, grand_total, remaining').eq('id', invoiceId).single();
  return data;
}

// ---------------------------------------------------------------- RETURN ORDER
export async function createReturnOrder(input: { invoice_id: string; return_date: string; reason: string; items: ReturnItemInput[]; doc_no?: string; warehouse_id?: string }) {
  if (!input.invoice_id) return { error: 'Mohon pilih Invoice terlebih dahulu.' };
  if (!input.return_date) return { error: 'Kolom Tanggal retur wajib diisi.' };
  const items = input.items.filter((it) => it.qty_returned > 0);
  if (items.length === 0) return { error: 'Mohon isi minimal satu qty retur.' };

  const supabase = createClient();
  const returnable = await getReturnableItems(input.invoice_id, 'ORDER');
  for (const it of items) {
    const m = returnable.find((r) => r.sku === it.sku);
    if (!m) return { error: `SKU ${it.sku} tidak ada di invoice ini` };
    if (it.qty_returned > m.returnable) return { error: `Qty retur ${it.sku} melebihi sisa yang dapat diretur (${m.returnable})` };
  }
  const inv = await loadInvoice(supabase, input.invoice_id);
  if (!inv) return { error: 'Invoice tidak ditemukan' };

  const { data: ret, error } = await supabase
    .from('sales_returns')
    .insert({ doc_no: input.doc_no?.trim() || null, kind: 'ORDER', return_date: input.return_date, invoice_id: input.invoice_id, client_id: inv.client_id, reason: input.reason || null, status: 'RECEIVED', warehouse_id: input.warehouse_id || null })
    .select('id, doc_no')
    .single();
  if (error) return { error: error.code === '23505' ? 'Return ID sudah digunakan oleh retur lain.' : error.message };

  const { error: iErr } = await supabase.from('sales_return_items').insert(
    items.map((it) => ({ sales_return_id: ret.id, sku: it.sku, qty_returned: it.qty_returned, unit_price: it.unit_price, subtotal: it.qty_returned * it.unit_price, condition: it.condition === 'Rusak' ? 'Rusak' : 'Baik' }))
  );
  if (iErr) return { error: iErr.message };

  // Hanya barang berkondisi Baik yang masuk kembali ke stok.
  const good = items.filter((it) => it.condition !== 'Rusak');
  const st = await addStock(supabase, ret.id, ret.doc_no, input.return_date, good, 'Retur penjualan (Return Order)', input.warehouse_id);
  if (st.error) return { error: st.error };
  refresh();
  return { success: true };
}

// ---------------------------------------------------------------- RETURN INVOICE
export type ReturnInvoiceInput = {
  invoice_id: string; return_date: string; reason: string; items: ReturnItemInput[];
  doc_no?: string; cn_doc_no?: string; return_order_id?: string; restock: boolean;
  warehouse_id?: string;
  settlement: 'CREDIT' | 'REFUND'; refund_method?: string; refund_reference?: string;
};

export async function createReturnInvoice(input: ReturnInvoiceInput) {
  if (!input.invoice_id) return { error: 'Mohon pilih Invoice terlebih dahulu.' };
  if (!input.return_date) return { error: 'Kolom Tanggal retur wajib diisi.' };
  const items = input.items.filter((it) => it.qty_returned > 0);
  if (items.length === 0) return { error: 'Mohon isi minimal satu qty retur.' };

  const supabase = createClient();
  const returnable = await getReturnableItems(input.invoice_id, 'INVOICE', input.return_order_id || undefined);
  for (const it of items) {
    const m = returnable.find((r) => r.sku === it.sku);
    if (!m) return { error: `SKU ${it.sku} tidak ada di invoice/Return Order ini` };
    if (it.qty_returned > m.returnable) return { error: `Qty retur ${it.sku} melebihi sisa yang dapat dikreditkan (${m.returnable})` };
  }
  const inv = await loadInvoice(supabase, input.invoice_id);
  if (!inv) return { error: 'Invoice tidak ditemukan' };

  const { factor } = await getInvoiceFactor(input.invoice_id);
  const subtotal = items.reduce((s, it) => s + it.qty_returned * it.unit_price, 0);
  const creditAmount = Math.round(subtotal * factor);
  const restock = !input.return_order_id && input.restock; // dari Return Order: stok sudah masuk saat Order

  const { data: ret, error } = await supabase
    .from('sales_returns')
    .insert({
      doc_no: input.doc_no?.trim() || null, kind: 'INVOICE', return_date: input.return_date, invoice_id: input.invoice_id,
      client_id: inv.client_id, reason: input.reason || null, status: 'COMPLETED',
      return_order_id: input.return_order_id || null, restock, settlement: input.settlement, warehouse_id: input.warehouse_id || null,
    })
    .select('id, doc_no')
    .single();
  if (error) return { error: error.code === '23505' ? 'Return ID sudah digunakan oleh retur lain.' : error.message };

  const { error: iErr } = await supabase.from('sales_return_items').insert(
    items.map((it) => ({ sales_return_id: ret.id, sku: it.sku, qty_returned: it.qty_returned, unit_price: it.unit_price, subtotal: it.qty_returned * it.unit_price, condition: 'Baik' }))
  );
  if (iErr) return { error: iErr.message };

  // Credit Note
  const { data: cn, error: cnErr } = await supabase
    .from('credit_notes')
    .insert({ doc_no: input.cn_doc_no?.trim() || null, cn_date: input.return_date, sales_return_id: ret.id, invoice_id: input.invoice_id, client_id: inv.client_id, amount: creditAmount, status: 'ISSUED' })
    .select('id')
    .single();
  if (cnErr) return { error: cnErr.code === '23505' ? 'Credit Note ID sudah digunakan.' : cnErr.message };
  await supabase.from('sales_returns').update({ credit_note_id: cn.id }).eq('id', ret.id);

  // Potong piutang invoice sebesar sisa yang ada; kelebihannya menjadi saldo kredit client.
  const apply = Math.min(creditAmount, Number(inv.remaining));
  let applied = 0;
  let refunded = 0;
  if (apply > 0) {
    const { error } = await supabase.from('credit_note_applications').insert({ credit_note_id: cn.id, invoice_id: input.invoice_id, kind: 'APPLY', amount: apply, app_date: input.return_date });
    if (error) return { error: error.message };
    applied = apply;
  }
  // Invoice sudah lunas & dipilih refund: kembalikan uang langsung.
  const leftover = creditAmount - applied;
  if (input.settlement === 'REFUND' && leftover > 0) {
    const { error } = await supabase.from('credit_note_applications').insert({ credit_note_id: cn.id, kind: 'REFUND', amount: leftover, app_date: input.return_date, method: input.refund_method || null, reference_no: input.refund_reference || null });
    if (error) return { error: error.message };
    refunded = leftover;
  }
  await supabase.from('credit_notes').update({ applied_amount: applied, refunded_amount: refunded, status: applied + refunded >= creditAmount ? 'CLOSED' : applied + refunded > 0 ? 'PARTIAL' : 'ISSUED' }).eq('id', cn.id);
  const synced = await syncInvoicePayments(supabase, input.invoice_id);
  if (synced.error) return { error: synced.error };

  if (restock) {
    const st = await addStock(supabase, ret.id, ret.doc_no, input.return_date, items, 'Retur penjualan (Return Invoice)', input.warehouse_id);
    if (st.error) return { error: st.error };
  }
  refresh();
  return { success: true, creditAmount, applied, refunded, balance: creditAmount - applied - refunded };
}

// ---------------------------------------------------------------- HAPUS
export async function deleteReturn(id: string) {
  const supabase = createClient();
  const { data: r } = await supabase.from('sales_returns').select('id, kind, invoice_id, credit_note_id').eq('id', id).single();
  if (!r) return { error: 'Data retur tidak ditemukan' };

  if (r.kind === 'ORDER') {
    const { count } = await supabase.from('sales_returns').select('id', { count: 'exact', head: true }).eq('return_order_id', id);
    if ((count ?? 0) > 0) return { error: 'Return Order ini sudah dipakai oleh Return Invoice, hapus Return Invoice terlebih dahulu.' };
  } else if (r.credit_note_id) {
    const { data: cn } = await supabase.from('credit_notes').select('refunded_amount, applied_amount').eq('id', r.credit_note_id).single();
    const { count } = await supabase.from('credit_note_applications').select('id', { count: 'exact', head: true }).eq('credit_note_id', r.credit_note_id).eq('kind', 'REFUND');
    if ((count ?? 0) > 0 || Number(cn?.refunded_amount ?? 0) > 0) return { error: 'Credit Note retur ini sudah direfund, tidak dapat dihapus.' };
    const { count: other } = await supabase.from('credit_note_applications').select('id', { count: 'exact', head: true }).eq('credit_note_id', r.credit_note_id).neq('invoice_id', r.invoice_id);
    if ((other ?? 0) > 0) return { error: 'Credit Note retur ini sudah dipakai pada invoice lain, tidak dapat dihapus.' };
  }

  await supabase.from('stock_movements').delete().eq('ref_type', 'SALES_RETURN').eq('ref_id', id);
  if (r.credit_note_id) {
    await supabase.from('sales_returns').update({ credit_note_id: null }).eq('id', id);
    await supabase.from('credit_notes').delete().eq('id', r.credit_note_id); // application ikut terhapus (cascade)
  }
  const { error } = await supabase.from('sales_returns').delete().eq('id', id);
  if (error) return { error: error.message };
  if (r.invoice_id) await syncInvoicePayments(supabase, r.invoice_id);
  refresh();
  return { success: true };
}
