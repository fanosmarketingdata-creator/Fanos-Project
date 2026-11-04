'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { guard } from '@/lib/permissions';
import { productInfoBySku } from '@/lib/spec-info';

const HREF = '/dashboard/lighting-specification';

export type SpecItemInput = { product_id: string | null; sku: string; uom: string; qty: number; drawing_code: string; name?: string };


export type SpecInput = { id?: string; boq_project_id: string; notes?: string; items: SpecItemInput[] };

export const specKey = (it: { product_id?: string | null; sku: string; uom?: string | null }) =>
  `${it.product_id ?? ''}|${it.sku}|${(it.uom ?? '').toLowerCase()}`;

type Supa = ReturnType<typeof createClient>;

// Item BOQ diakumulasi per SKU (sintesis lintas Area/Sub-area), urutan mengikuti kemunculan pertama.
async function synthesize(supabase: Supa, boqId: string) {
  const { data: items } = await supabase
    .from('boq_project_items')
    .select('sku, qty, uom, product_id')
    .eq('boq_project_id', boqId)
    .order('sort_order');
  const by = new Map<string, { sku: string; qty: number; uom: string; product_id: string | null; name: string }>();
  (items ?? []).forEach((it) => {
    const row = { sku: it.sku as string, uom: (it.uom as string | null) ?? '', product_id: (it.product_id as string | null) ?? null };
    const k = specKey(row);
    const cur = by.get(k);
    if (cur) cur.qty += Number(it.qty) || 0;
    else by.set(k, { ...row, qty: Number(it.qty) || 0, name: '' });
  });
  const list = Array.from(by.values());
  const skus = Array.from(new Set(list.map((l) => l.sku)));
  const info = await productInfoBySku(supabase, skus);
  const full = list.map((l) => ({ ...l, name: info.get(l.sku)?.name ?? '', image_url: info.get(l.sku)?.image_url ?? null, spec: info.get(l.sku)?.spec ?? [] }));
  return full;
}

// Dipakai form: item BOQ (belum disimpan) saat BOQ dipilih. BOQ berstatus DRAFT pun boleh.
export async function getBOQSynthesis(boqId: string) {
  const supabase = createClient();
  const items = await synthesize(supabase, boqId);
  return items.map((i) => ({ ...i, drawing_code: '' }));
}

export async function saveLightingSpec(input: SpecInput) {
  { const denied = await guard(HREF, 'save', input); if (denied) return { error: denied }; }
  if (!input.boq_project_id) return { error: 'Pilih BOQ Project terlebih dahulu.' };
  if (!input.items.length) return { error: 'BOQ ini belum memiliki item.' };

  const supabase = createClient();
  let id = input.id;
  if (id) {
    const { error } = await supabase.from('lighting_specifications').update({ notes: input.notes || null, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return { error: error.message };
    await supabase.from('lighting_specification_items').delete().eq('spec_id', id);
  } else {
    const { data, error } = await supabase.from('lighting_specifications').insert({ boq_project_id: input.boq_project_id, notes: input.notes || null }).select('id').single();
    if (error) return { error: error.code === '23505' ? 'BOQ ini sudah memiliki Lighting Specification.' : error.message };
    id = data.id as string;
  }
  const { error: ie } = await supabase.from('lighting_specification_items').insert(
    input.items.map((it, i) => ({
      spec_id: id, product_id: it.product_id, sku: it.sku, uom: it.uom || null, qty: Number(it.qty) || 0,
      drawing_code: it.drawing_code?.trim() || null, sort_order: i,
    })),
  );
  if (ie) return { error: ie.message };
  revalidatePath(HREF);
  return { success: true, id };
}

// Samakan item spesifikasi dengan BOQ terbaru. Kode gambar yang sudah diisi dipertahankan
// (dicocokkan lewat produk + UOM); item baru kodenya kosong; item yang sudah tidak ada di BOQ dihapus.
export async function syncLightingSpec(id: string, codes: Record<string, string>) {
  { const denied = await guard(HREF, 'edit'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: spec } = await supabase.from('lighting_specifications').select('boq_project_id').eq('id', id).single();
  if (!spec) return { error: 'Lighting Specification tidak ditemukan.' };
  const { data: old } = await supabase.from('lighting_specification_items').select('product_id, sku, uom, drawing_code').eq('spec_id', id);
  const saved = new Map((old ?? []).map((o) => [specKey(o as { product_id: string | null; sku: string; uom: string | null }), (o.drawing_code as string | null) ?? '']));

  const fresh = await synthesize(supabase, spec.boq_project_id as string);
  await supabase.from('lighting_specification_items').delete().eq('spec_id', id);
  if (fresh.length) {
    const { error } = await supabase.from('lighting_specification_items').insert(
      fresh.map((it, i) => {
        const k = specKey(it);
        const code = (k in codes ? codes[k] : saved.get(k) ?? '').trim();
        return { spec_id: id, product_id: it.product_id, sku: it.sku, uom: it.uom || null, qty: it.qty, drawing_code: code || null, sort_order: i };
      }),
    );
    if (error) return { error: error.message };
  }
  await supabase.from('lighting_specifications').update({ updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath(HREF);
  return { success: true };
}

export async function deleteLightingSpec(id: string) {
  { const denied = await guard(HREF, 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { error } = await supabase.from('lighting_specifications').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(HREF);
  return { success: true };
}
