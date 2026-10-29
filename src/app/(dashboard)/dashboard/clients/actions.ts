'use server';

import { guard } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ClientInput = {
  id?: string;
  company: string;
  contact_name?: string;
  position?: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit?: number | null;
  status?: string;
};

export async function saveClient(input: ClientInput) {
  { const denied = await guard('/dashboard/clients', 'save', input); if (denied) return { error: denied }; }
  if (!input.company?.trim()) {
    return { error: 'Kolom Company Name wajib diisi.' };
  }

  const supabase = createClient();
  // Client No (AUTOGENERATE) dibuat oleh database; project_name disinkronkan dari company oleh trigger.
  const payload = {
    company: input.company.trim(),
    contact_name: input.contact_name || null,
    position: input.position || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    credit_limit: input.credit_limit ?? null,
    status: ['Active', 'Inactive', 'Blacklist', 'Unverified'].includes(input.status || '') ? input.status : 'Unverified',
  };

  let id = input.id;
  if (id) {
    const { error } = await supabase.from('clients').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from('clients').insert(payload).select('id').single();
    if (error) return { error: error.message };
    id = data.id as string;
  }

  revalidatePath('/dashboard/clients');
  return { success: true, id, company: payload.company };
}

export async function deleteClient(id: string) {
  { const denied = await guard('/dashboard/clients', 'delete'); if (denied) return { error: denied }; }
  const supabase = createClient();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/clients');
  return { success: true };
}

export type ClientProjectInfo = {
  id: string;
  name: string;
  project_no: string | null;
  location: string | null;
  boq: number;
  quotations: number;
  salesOrders: number;
  pmStatus: string | null;
  stage: 'Berjalan' | 'Prospek' | 'Selesai';
};

// Daftar project milik client beserta tahapnya (dipakai di Client Detail).
export async function getClientProjects(clientId: string): Promise<ClientProjectInfo[]> {
  const supabase = createClient();
  const { data: projects } = await supabase.from('projects').select('id, name, project_no, location').eq('client_id', clientId).order('created_at', { ascending: false });
  const list = projects ?? [];
  if (list.length === 0) return [];
  const ids = list.map((p) => p.id as string);
  const [{ data: boqs }, { data: quotes }, { data: pms }] = await Promise.all([
    supabase.from('boq_projects').select('id, project_id').in('project_id', ids),
    supabase.from('quotations').select('id, project_id').in('project_id', ids),
    supabase.from('pm_projects').select('master_project_id, status').in('master_project_id', ids),
  ]);
  const boqIds = (boqs ?? []).map((b) => b.id as string);
  const quoteIds = (quotes ?? []).map((q) => q.id as string);
  const sos: { status: string; boq_project_id: string | null; quotation_id: string | null }[] = [];
  if (boqIds.length) {
    const { data } = await supabase.from('sales_orders').select('status, boq_project_id, quotation_id').in('boq_project_id', boqIds);
    sos.push(...((data ?? []) as typeof sos));
  }
  if (quoteIds.length) {
    const { data } = await supabase.from('sales_orders').select('status, boq_project_id, quotation_id').in('quotation_id', quoteIds);
    ((data ?? []) as typeof sos).forEach((s) => { if (!sos.some((x) => x.quotation_id === s.quotation_id && x.boq_project_id === s.boq_project_id && x.status === s.status)) sos.push(s); });
  }
  return list.map((p) => {
    const pid = p.id as string;
    const myBoq = (boqs ?? []).filter((b) => b.project_id === pid).map((b) => b.id as string);
    const myQuote = (quotes ?? []).filter((q) => q.project_id === pid).map((q) => q.id as string);
    const mySo = sos.filter((s) => (s.boq_project_id && myBoq.includes(s.boq_project_id)) || (s.quotation_id && myQuote.includes(s.quotation_id)));
    const pm = (pms ?? []).find((x) => x.master_project_id === pid)?.status as string | undefined;
    const active = mySo.filter((s) => !['COMPLETED', 'CANCELLED'].includes(s.status));
    let stage: ClientProjectInfo['stage'] = 'Prospek';
    if (active.length > 0 || pm === 'In Progress' || pm === 'Planning') stage = 'Berjalan';
    else if (pm === 'Completed' || (mySo.length > 0 && active.length === 0)) stage = 'Selesai';
    return { id: pid, name: p.name as string, project_no: (p.project_no as string) ?? null, location: (p.location as string) ?? null, boq: myBoq.length, quotations: myQuote.length, salesOrders: mySo.length, pmStatus: pm ?? null, stage };
  });
}
