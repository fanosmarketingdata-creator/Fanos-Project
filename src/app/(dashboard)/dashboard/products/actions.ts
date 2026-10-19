'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { SPEC_KEYS, type SpecKey } from './fields';

export type ProductInput = {
  id?: string;
  // SKU No = AUTOGENERATE; tidak dikirim dari form.
  name: string;
  image_url?: string | null;
  category?: string; // Main Category
  subcategory?: string;
  application?: string;
  uom: string;
  cost_price: number;
  price: number; // Standard Selling Price
  notes?: string;
} & Partial<Record<SpecKey, string>>;

export async function saveProduct(input: ProductInput) {
  if (!input.name?.trim()) return { error: 'Product Name wajib diisi' };
  if (!input.category) return { error: 'Main Category wajib dipilih' };

  const supabase = createClient();

  const specs: Record<string, string | null> = {};
  for (const k of SPEC_KEYS) specs[k] = (input[k] ?? '').trim() || null;

  // Brand = HIDDEN (otomatis FANOS oleh default database), SKU = AUTOGENERATE (trigger database).
  const payload = {
    name: input.name.trim(),
    image_url: input.image_url || null,
    category: input.category || null,
    subcategory: input.subcategory || null,
    application: input.application || null,
    uom: input.uom || 'Pcs',
    cost_price: input.cost_price || 0,
    price: input.price || 0,
    notes: input.notes?.trim() || null,
    ...specs,
  };

  const query = input.id
    ? supabase.from('products').update(payload).eq('id', input.id)
    : supabase.from('products').insert(payload);

  const { error } = await query;
  if (error) {
    if (error.code === '23505') return { error: 'SKU sudah digunakan produk lain' };
    return { error: error.message };
  }

  revalidatePath('/dashboard/products');
  return { success: true };
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/products');
  return { success: true };
}
