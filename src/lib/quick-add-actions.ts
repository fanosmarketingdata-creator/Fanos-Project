'use server';

import { createClient } from '@/lib/supabase/server';

// Data untuk dropdown Project/Client di form BOQ & Quotation serta pop up tambah baru.
export async function getProjectClientLookups() {
  const supabase = createClient();
  const [{ data: projects }, { data: clients }, { data: classes }] = await Promise.all([
    supabase.from('projects').select('id, name, client_id, project_no').order('created_at', { ascending: false }),
    supabase.from('clients').select('id, company, contact_name').order('company'),
    supabase.from('project_classifications').select('name').order('created_at'),
  ]);
  return {
    projects: (projects ?? []) as { id: string; name: string; client_id: string | null; project_no: string | null }[],
    clients: (clients ?? []) as { id: string; company: string; contact_name: string | null }[],
    classifications: (classes ?? []).map((c) => c.name as string),
  };
}

export async function getBrandNames() {
  const supabase = createClient();
  const { data } = await supabase.from('brands').select('name').order('name');
  return (data ?? []).map((b) => b.name as string);
}

// Tambah produk dari form lain (mis. BOQ). SKU dibuat otomatis oleh trigger database.
export async function createProductQuick(input: { name: string; brand?: string; category: string; subcategory?: string; application?: string; uom?: string }) {
  if (!input.name?.trim()) return { error: 'Kolom Product Name wajib diisi.' };
  if (!input.category) return { error: 'Mohon pilih Main Category terlebih dahulu.' };
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name.trim(),
      brand: input.brand?.trim() || 'FANOS',
      category: input.category,
      subcategory: input.subcategory || null,
      application: input.application || null,
      uom: input.uom || 'Pcs',
      package_type: 'Carton',
    })
    .select('id, sku, name, uom, image_url, brand, category, price, cost_price')
    .single();
  if (error || !data) return { error: error?.message ?? 'Produk gagal disimpan.' };
  return { product: data as { id: string; sku: string; name: string; uom: string; image_url: string | null; brand: string | null; category: string | null; price: number | null; cost_price: number | null } };
}
