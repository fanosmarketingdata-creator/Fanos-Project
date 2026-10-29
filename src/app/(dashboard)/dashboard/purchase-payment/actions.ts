'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncPurchaseInvoice } from '@/lib/purchase-sync';

export type PurchasePaymentInput = {
  invoice_id: string; doc_no?: string; pay_date: string; amount: number; discount: number; method?: string; reference_no?: string; notes?: string;
};

function refresh() {
  ['purchase-invoice', 'purchase-payment'].forEach((p) => revalidatePath('/dashboard/' + p));
}

export async function savePurchasePayment(input: PurchasePaymentInput) {
  { const denied = await guard('/dashboard/purchase-payment', 'save', input); if (denied) return { error: denied }; }
  if (!input.invoice_id) return { error: 'Mohon pilih Purchase Invoice terlebih dahulu.' };
  if (!input.pay_date) return { error: 'Kolom Tanggal Payment wajib diisi.' };
  const amount = Number(input.amount) || 0;
  const discount = Number(input.discount) || 0;
  if (amount < 0 || discount < 0) return { error: 'Jumlah tidak boleh negatif.' };
  if (amount + discount <= 0) return { error: 'Jumlah Payment atau Total Discount harus lebih dari 0.' };

  const supabase = createClient();
  const { data: inv } = await supabase.from('purchase_invoices').select('remaining').eq('id', input.invoice_id).single();
  if (!inv) return { error: 'Invoice tidak ditemukan' };
  if (amount + discount > Number(inv.remaining) + 0.005) {
    return { error: `Jumlah payment + discount melebihi sisa utang (Rp ${Number(inv.remaining).toLocaleString('id-ID')}).` };
  }
  const manual = input.doc_no?.trim();
  const { error } = await supabase.from('purchase_payments').insert({
    purchase_invoice_id: input.invoice_id, doc_no: manual || null, pay_date: input.pay_date, amount, discount,
    method: input.method || null, reference_no: input.reference_no || null, notes: input.notes || null,
  });
  if (error) return { error: error.code === '23505' ? `Payment ID "${manual}" sudah dipakai.` : error.message };
  const synced = await syncPurchaseInvoice(supabase, input.invoice_id);
  if (synced.error) return { error: synced.error };
  refresh();
  return { success: true };
}

export async function deletePurchasePayment(id: string) {
  { const denied = await guard('/dashboard/purchase-payment', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: p } = await supabase.from('purchase_payments').select('purchase_invoice_id').eq('id', id).single();
  const { error } = await supabase.from('purchase_payments').delete().eq('id', id);
  if (error) return { error: error.message };
  if (p?.purchase_invoice_id) {
    const synced = await syncPurchaseInvoice(supabase, p.purchase_invoice_id);
    if (synced.error) return { error: synced.error };
  }
  refresh();
  return { success: true };
}
