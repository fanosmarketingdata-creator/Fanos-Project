'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function getInvoicesForReturn() {
  const supabase = createClient();
  const { data } = await supabase
    .from('invoices')
    .select('id, inv_date, grand_total, clients(project_name)')
    .order('inv_date', { ascending: false });

  return (data ?? []).map((inv) => ({
    id: inv.id,
    inv_date: inv.inv_date,
    grand_total: Number(inv.grand_total),
    client_name: (inv.clients as unknown as { project_name: string } | null)?.project_name ?? '-',
  }));
}

// Qty yang masih boleh diretur per item = qty di invoice - total yang sudah
// pernah diretur dari invoice yang sama (lintas retur sebelumnya).
export async function getReturnableItems(invoiceId: string) {
  const supabase = createClient();

  const [{ data: invItems }, { data: priorReturns }] = await Promise.all([
    supabase.from('invoice_items').select('sku, qty, unit_price, products(name)').eq('invoice_id', invoiceId),
    supabase.from('sales_returns').select('id, sales_return_items(sku, qty_returned)').eq('invoice_id', invoiceId),
  ]);

  const returnedBySku = new Map<string, number>();
  (priorReturns ?? []).forEach((r) => {
    ((r.sales_return_items as unknown as { sku: string; qty_returned: number }[]) ?? []).forEach((ri) => {
      returnedBySku.set(ri.sku, (returnedBySku.get(ri.sku) ?? 0) + Number(ri.qty_returned));
    });
  });

  return (invItems ?? []).map((it) => {
    const alreadyReturned = returnedBySku.get(it.sku) ?? 0;
    return {
      sku: it.sku,
      name: (it.products as unknown as { name: string } | null)?.name ?? '',
      invoiced: Number(it.qty),
      returned: alreadyReturned,
      returnable: Number(it.qty) - alreadyReturned,
      unit_price: Number(it.unit_price),
    };
  });
}

export type ReturnItemInput = { sku: string; qty_returned: number; unit_price: number };

export async function createReturn(invoiceId: string, returnDate: string, reason: string, items: ReturnItemInput[]) {
  if (!invoiceId) return { error: 'Mohon pilih Invoice terlebih dahulu.' };
  if (!returnDate) return { error: 'Kolom Tanggal retur wajib diisi.' };

  const toReturn = items.filter((it) => it.qty_returned > 0);
  if (toReturn.length === 0) return { error: 'Mohon isi minimal satu qty retur.' };

  const supabase = createClient();

  // Validasi ulang di server (jangan percaya hasil hitung dari browser)
  const returnable = await getReturnableItems(invoiceId);
  for (const it of toReturn) {
    const match = returnable.find((r) => r.sku === it.sku);
    if (!match) return { error: `SKU ${it.sku} tidak ada di invoice ini` };
    if (it.qty_returned > match.returnable) {
      return { error: `Qty retur ${it.sku} melebihi sisa yang dapat diretur (${match.returnable})` };
    }
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, client_id, grand_total, total_paid, remaining')
    .eq('id', invoiceId)
    .single();
  if (!invoice) return { error: 'Invoice tidak ditemukan' };

  const creditAmount = toReturn.reduce((s, it) => s + it.qty_returned * it.unit_price, 0);

  const { data: salesReturn, error: retError } = await supabase
    .from('sales_returns')
    .insert({
      return_date: returnDate,
      invoice_id: invoiceId,
      client_id: invoice.client_id,
      reason: reason || null,
      status: 'COMPLETED',
    })
    .select('id')
    .single();
  if (retError) return { error: retError.message };

  const itemRows = toReturn.map((it) => ({
    sales_return_id: salesReturn.id,
    sku: it.sku,
    qty_returned: it.qty_returned,
    unit_price: it.unit_price,
    subtotal: it.qty_returned * it.unit_price,
  }));
  const { error: itemsError } = await supabase.from('sales_return_items').insert(itemRows);
  if (itemsError) return { error: itemsError.message };

  const { data: creditNote, error: cnError } = await supabase
    .from('credit_notes')
    .insert({
      cn_date: returnDate,
      sales_return_id: salesReturn.id,
      client_id: invoice.client_id,
      amount: creditAmount,
      status: 'ISSUED',
    })
    .select('id')
    .single();
  if (cnError) return { error: cnError.message };

  await supabase.from('sales_returns').update({ credit_note_id: creditNote.id }).eq('id', salesReturn.id);

  // Credit note mengurangi sisa tagihan invoice (maksimal sebesar sisa yang
  // ada — kalau invoice sudah lunas, credit note tetap tercatat sebagai
  // kredit client tapi tidak mengubah angka invoice).
  const currentRemaining = Number(invoice.remaining);
  const appliedCredit = Math.min(creditAmount, currentRemaining);
  if (appliedCredit > 0) {
    const newRemaining = currentRemaining - appliedCredit;
    await supabase
      .from('invoices')
      .update({
        remaining: newRemaining,
        status: newRemaining <= 0 ? 'PAID' : Number(invoice.total_paid) > 0 ? 'PARTIAL' : 'UNPAID',
      })
      .eq('id', invoiceId);
  }

  revalidatePath('/dashboard/returns');
  revalidatePath('/dashboard/credit-notes');
  revalidatePath('/dashboard/invoices');
  revalidatePath('/dashboard/outstanding');
  return { success: true, creditAmount, appliedCredit };
}
