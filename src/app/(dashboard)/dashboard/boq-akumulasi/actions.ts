'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Menjumlahkan qty per SKU dari seluruh item BOQ Project (lintas
// Area/Sub-area), lalu ditulis sebagai baris BOQ Akumulasi. Dipanggil
// ulang untuk "refresh" angka kalau BOQ Project-nya diedit lagi setelah
// akumulasi pertama dibuat.
export async function generateAkumulasi(boqProjectId: string) {
  const supabase = createClient();

  const { data: items, error: itemsError } = await supabase
    .from('boq_project_items')
    .select('sku, qty, uom')
    .eq('boq_project_id', boqProjectId);

  if (itemsError) return { error: itemsError.message };
  if (!items || items.length === 0) return { error: 'BOQ Project ini belum punya item' };

  const totals = new Map<string, { qty: number; uom: string }>();
  items.forEach((it) => {
    const existing = totals.get(it.sku);
    if (existing) existing.qty += Number(it.qty);
    else totals.set(it.sku, { qty: Number(it.qty), uom: it.uom ?? '' });
  });

  // Hapus akumulasi lama untuk project ini, tulis ulang dari hasil hitung
  // terbaru (lebih sederhana & selalu konsisten daripada diff manual).
  const { error: delErr } = await supabase.from('boq_akumulasi').delete().eq('boq_project_id', boqProjectId);
  if (delErr) return { error: delErr.message };

  const rows = Array.from(totals.entries()).map(([sku, v]) => ({
    boq_project_id: boqProjectId,
    sku,
    qty: v.qty,
    uom: v.uom,
  }));

  const { error: insErr } = await supabase.from('boq_akumulasi').insert(rows);
  if (insErr) return { error: insErr.message };

  revalidatePath('/dashboard/boq-akumulasi');
  revalidatePath(`/dashboard/boq-akumulasi/${boqProjectId}`);
  return { success: true };
}

export async function updateAkumulasiQty(id: string, qty: number) {
  const supabase = createClient();
  const { error } = await supabase.from('boq_akumulasi').update({ qty }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/boq-akumulasi');
  return { success: true };
}

export async function deleteAkumulasi(boqProjectId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('boq_akumulasi').delete().eq('boq_project_id', boqProjectId);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/boq-akumulasi');
  return { success: true };
}
