'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function saveBrand(input: { id?: string; name: string }) {
  const name = input.name?.trim();
  if (!name) return { error: 'Kolom Brand Name wajib diisi.' };

  const supabase = createClient();
  if (input.id) {
    const { data: existing } = await supabase.from('brands').select('name').eq('id', input.id).single();
    const { error } = await supabase.from('brands').update({ name }).eq('id', input.id);
    if (error) return { error: error.code === '23505' ? 'Brand tersebut sudah terdaftar.' : error.message };
    // products.brand menyimpan NAMA brand, jadi ikut diperbarui bila brand diganti namanya.
    if (existing && existing.name !== name) {
      await supabase.from('products').update({ brand: name }).eq('brand', existing.name);
    }
  } else {
    const { error } = await supabase.from('brands').insert({ name });
    if (error) return { error: error.code === '23505' ? 'Brand tersebut sudah terdaftar.' : error.message };
  }

  revalidatePath('/dashboard/brands');
  revalidatePath('/dashboard/products');
  return { success: true };
}

export async function deleteBrand(id: string) {
  const supabase = createClient();
  const { data: b } = await supabase.from('brands').select('name').eq('id', id).single();
  if (!b) return { error: 'Brand tidak ditemukan' };

  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('brand', b.name);
  if ((count ?? 0) > 0) return { error: 'Brand ini masih digunakan oleh produk sehingga tidak dapat dihapus.' };

  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/brands');
  return { success: true };
}
