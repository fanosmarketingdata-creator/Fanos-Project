'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ProductInput = {
  id?: string;
  sku: string;
  name: string;
  brand?: string;
  uom: string;
  price: number;
  image_url?: string | null;
  category?: string;
};

export async function saveProduct(input: ProductInput) {
  if (!input.sku?.trim()) return { error: 'SKU wajib diisi' };
  if (!input.name?.trim()) return { error: 'Nama produk wajib diisi' };

  const supabase = createClient();
  const payload = {
    sku: input.sku.trim(),
    name: input.name.trim(),
    brand: input.brand || null,
    uom: input.uom || 'Pcs',
    price: input.price || 0,
    image_url: input.image_url || null,
    category: input.category || null,
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
