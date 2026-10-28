'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ensureProject } from '@/lib/project-sync';

export type BOQItemInput = {
  product_id: string | null;
  sku: string;
  qty: number;
  uom: string;
  kode_gambar?: string;
};
export type BOQSubAreaInput = { name: string; items: BOQItemInput[] };
export type BOQAreaInput = { name: string; subAreas: BOQSubAreaInput[] };

export type BOQProjectInput = {
  id?: string;
  project_name: string;
  client_id: string;
  boq_date: string;
  status: 'DRAFT' | 'APPROVED';
  progress: 'Pending' | 'InProgress' | 'Completed';
  route_type: string;
  areas: BOQAreaInput[];
};

export async function saveBOQProject(input: BOQProjectInput) {
  if (!input.project_name?.trim()) return { error: 'Kolom Project Name wajib diisi.' };
  if (!input.client_id) return { error: 'Mohon pilih Client terlebih dahulu.' };
  if (!input.boq_date) return { error: 'Kolom Tanggal BOQ wajib diisi.' };

  const hasAnyItem = input.areas.some((a) => a.subAreas.some((s) => s.items.length > 0));
  if (!hasAnyItem) return { error: 'Minimal satu item harus ditambahkan.' };

  const supabase = createClient();

  const headerPayload = {
    project_name: input.project_name.trim(),
    client_id: input.client_id,
    boq_date: input.boq_date,
    status: input.status,
    progress: input.progress,
    route_type: input.route_type,
  };

  // Nama project otomatis masuk / terhubung ke Master Project.
  const projectId = await ensureProject(supabase, input.project_name, input.client_id);

  let boqId = input.id;

  if (boqId) {
    const { error } = await supabase.from('boq_projects').update(headerPayload).eq('id', boqId);
    if (error) return { error: error.message };
    // Hapus item lama, tulis ulang dari form (lebih sederhana daripada diff)
    const { error: delErr } = await supabase.from('boq_project_items').delete().eq('boq_project_id', boqId);
    if (delErr) return { error: delErr.message };
  } else {
    const { data, error } = await supabase.from('boq_projects').insert(headerPayload).select('id').single();
    if (error) return { error: error.message };
    boqId = data.id;
  }

  const rows: Record<string, unknown>[] = [];
  let sortOrder = 0;
  input.areas.forEach((area) => {
    area.subAreas.forEach((sub) => {
      sub.items.forEach((item) => {
        if (!item.sku) return;
        rows.push({
          boq_project_id: boqId,
          area_name: area.name,
          sub_area_name: sub.name,
          product_id: item.product_id,
          sku: item.sku,
          qty: item.qty || 0,
          uom: item.uom,
          kode_gambar: item.kode_gambar || null,
          sort_order: sortOrder++,
        });
      });
    });
  });

  if (rows.length > 0) {
    const { error: itemsError } = await supabase.from('boq_project_items').insert(rows);
    if (itemsError) return { error: itemsError.message };
  }

  if (projectId && boqId) await supabase.from('boq_projects').update({ project_id: projectId }).eq('id', boqId); // abaikan bila migrasi 0029 belum dijalankan
  revalidatePath('/dashboard/projects');
  revalidatePath('/dashboard/boq-project');
  return { success: true, id: boqId };
}

export async function deleteBOQProject(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('boq_projects').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/boq-project');
  return { success: true };
}
