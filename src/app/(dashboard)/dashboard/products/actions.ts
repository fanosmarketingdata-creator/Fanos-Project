'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { SPEC_KEYS, PACK_NUM_KEYS, type SpecKey, type PackNumKey } from './fields';

export type ProductInput = {
  id?: string;
  // SKU No = AUTOGENERATE; tidak dikirim dari form.
  name: string;
  brand?: string;
  image_url?: string | null;
  category?: string; // Main Category
  subcategory?: string;
  application?: string;
  uom: string;
  cost_price?: number; // diatur di Price List
  price?: number; // Standard Selling Price, diatur di Price List
  notes?: string;
  package_type?: string;
} & Partial<Record<SpecKey, string>> & Partial<Record<PackNumKey, number>>;

export async function saveProduct(input: ProductInput) {
  if (!input.name?.trim()) return { error: 'Kolom Product Name wajib diisi.' };
  if (!input.category) return { error: 'Mohon pilih Main Category terlebih dahulu.' };

  const supabase = createClient();

  const specs: Record<string, string | null> = {};
  for (const k of SPEC_KEYS) specs[k] = (input[k] ?? '').trim() || null;

  const pack: Record<string, number> = {};
  for (const k of PACK_NUM_KEYS) {
    const v = Number(input[k]) || 0;
    if (v < 0) return { error: 'Data pengemasan tidak boleh negatif.' };
    pack[k] = v;
  }
  if (pack.gross_weight > 0 && pack.units_per_package > 0 && pack.net_weight * pack.units_per_package > pack.gross_weight + 0.0005) {
    return { error: 'Berat kotor per kemasan tidak boleh lebih kecil dari berat bersih (berat bersih per unit × isi per kemasan).' };
  }

  // Brand dipilih dari master Brand (default FANOS), SKU = AUTOGENERATE (trigger database).
  const payload = {
    name: input.name.trim(),
    brand: input.brand?.trim() || 'FANOS',
    image_url: input.image_url || null,
    category: input.category || null,
    subcategory: input.subcategory || null,
    application: input.application || null,
    uom: input.uom || 'Pcs',
    notes: input.notes?.trim() || null,
    package_type: input.package_type || 'Carton',
    ...pack,
    ...specs,
  };

  const query = input.id
    ? supabase.from('products').update(payload).eq('id', input.id)
    : supabase.from('products').insert(payload);

  const { error } = await query;
  if (error) {
    if (error.code === '23505') return { error: 'SKU telah digunakan oleh produk lain.' };
    return { error: error.message };
  }

  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/products/price-list');
  return { success: true };
}

export async function savePrices(id: string, cost_price: number, price: number) {
  if (!(cost_price >= 0) || !(price >= 0)) return { error: 'Harga tidak valid.' };
  const supabase = createClient();
  const { error } = await supabase.from('products').update({ cost_price, price, price_listed: true }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/products/price-list');
  return { success: true };
}

// Keluarkan produk dari Price List (produk tetap ada di Catalogue).
export async function removeFromPriceList(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('products').update({ price_listed: false, cost_price: 0, price: 0 }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/products/price-list');
  return { success: true };
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/products');
  return { success: true };
}
