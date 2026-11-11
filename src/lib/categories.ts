import type { SupabaseClient } from '@supabase/supabase-js';
import { PRODUCT_CATEGORIES } from '@/lib/master-options';

export type CategoryMap = Record<string, string[]>;

// Daftar Main Category -> Subcategory dari tabel product_categories.
// Bila tabel belum ada / kosong (migrasi 0040 belum dijalankan) dipakai daftar bawaan.
export async function loadCategories(supabase: SupabaseClient): Promise<CategoryMap> {
  try {
    const { data, error } = await supabase.from('product_categories').select('name, subcategories').order('sort').order('created_at');
    if (error || !data || data.length === 0) return PRODUCT_CATEGORIES;
    return Object.fromEntries(data.map((c) => [c.name as string, (c.subcategories as string[] | null) ?? []]));
  } catch {
    return PRODUCT_CATEGORIES;
  }
}
