'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

function cleanSubs(list: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = raw.trim();
    if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); }
  }
  return out;
}

function refresh() {
  revalidatePath('/dashboard/product-categories');
  revalidatePath('/dashboard/products');
  revalidatePath('/dashboard/products/price-list');
}

export async function saveCategory(input: { id?: string; name: string; subcategories: string[] }) {
  { const denied = await guard('/dashboard/product-categories', 'save', input); if (denied) return { error: denied }; }
  const name = input.name?.trim();
  if (!name) return { error: 'Kolom Main Category wajib diisi.' };
  const subs = cleanSubs(input.subcategories ?? []);

  const supabase = createClient();

  if (input.id) {
    const { data: old, error: e0 } = await supabase.from('product_categories').select('name, subcategories').eq('id', input.id).single();
    if (e0 || !old) return { error: 'Kategori tidak ditemukan.' };

    // Subcategory yang dihapus tidak boleh masih dipakai produk
    const removed = ((old.subcategories as string[] | null) ?? []).filter((s) => !subs.some((n) => n.toLowerCase() === s.toLowerCase()));
    if (removed.length) {
      const { data: used } = await supabase.from('products').select('subcategory').eq('category', old.name as string).in('subcategory', removed);
      const usedNames = Array.from(new Set((used ?? []).map((u) => u.subcategory as string)));
      if (usedNames.length) return { error: `Subcategory masih dipakai produk dan tidak bisa dihapus: ${usedNames.join(', ')}.` };
    }

    const { error } = await supabase.from('product_categories').update({ name, subcategories: subs }).eq('id', input.id);
    if (error) return { error: error.code === '23505' ? 'Main Category tersebut sudah terdaftar.' : error.message };

    // Ganti nama kategori -> ikut memperbarui produk yang memakainya
    if (old.name !== name) {
      const { error: e2 } = await supabase.from('products').update({ category: name }).eq('category', old.name as string);
      if (e2) return { error: 'Kategori tersimpan, tetapi gagal memperbarui produk: ' + e2.message };
    }
  } else {
    const { data: last } = await supabase.from('product_categories').select('sort').order('sort', { ascending: false }).limit(1);
    const sort = ((last?.[0]?.sort as number | undefined) ?? 0) + 1;
    const { error } = await supabase.from('product_categories').insert({ name, subcategories: subs, sort });
    if (error) return { error: error.code === '23505' ? 'Main Category tersebut sudah terdaftar.' : error.message };
  }

  refresh();
  return { success: true };
}

export async function deleteCategory(id: string) {
  { const denied = await guard('/dashboard/product-categories', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { data: cat } = await supabase.from('product_categories').select('name').eq('id', id).single();
  if (!cat) return { error: 'Kategori tidak ditemukan.' };
  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('category', cat.name as string);
  if (count && count > 0) return { error: `Kategori "${cat.name}" masih dipakai ${count} produk. Pindahkan produknya ke kategori lain terlebih dahulu.` };
  const { error } = await supabase.from('product_categories').delete().eq('id', id);
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}
