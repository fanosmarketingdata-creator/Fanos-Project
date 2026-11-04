import type { createClient } from '@/lib/supabase/server';
import { SPEC_KEYS, specLines } from '@/app/(dashboard)/dashboard/products/fields';

// Nama, gambar, dan spesifikasi gabungan produk per SKU (untuk kolom Lighting Specification).
export async function productInfoBySku(supabase: ReturnType<typeof createClient>, skus: string[]) {
  const map = new Map<string, { name: string; image_url: string | null; spec: string[] }>();
  if (!skus.length) return map;
  const { data } = await supabase.from('products').select(['sku', 'name', 'image_url', ...SPEC_KEYS].join(', ')).in('sku', skus);
  ((data ?? []) as unknown as Record<string, string | null>[]).forEach((p) =>
    map.set(p.sku as string, { name: (p.name as string) ?? '', image_url: p.image_url ?? null, spec: specLines(p) }),
  );
  return map;
}
