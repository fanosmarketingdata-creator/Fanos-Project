import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { productInfoBySku } from '@/lib/spec-info';
import LightingSpecPrint from './LightingSpecPrint';

export default async function LightingSpecPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: spec } = await supabase
    .from('lighting_specifications')
    .select('id, notes, updated_at, boq_projects(project_name, clients(company, project_name, contact_name, address))')
    .eq('id', params.id)
    .single();
  if (!spec) notFound();

  const { data: items } = await supabase
    .from('lighting_specification_items')
    .select('sku, uom, qty, drawing_code, sort_order')
    .eq('spec_id', params.id)
    .order('sort_order');
  const info = await productInfoBySku(supabase, Array.from(new Set((items ?? []).map((i) => i.sku as string))));

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user ? await supabase.from('profiles').select('full_name, role').eq('id', user.id).single() : { data: null };

  const boq = spec.boq_projects as unknown as { project_name: string; clients: { company: string | null; project_name: string; contact_name: string | null; address: string | null } | null } | null;

  return (
    <LightingSpecPrint
      specId={spec.id as string}
      project={boq?.project_name ?? '-'}
      client={boq?.clients?.company || boq?.clients?.project_name || '-'}
      attn={boq?.clients?.contact_name ?? ''}
      address={boq?.clients?.address ?? ''}
      notes={(spec.notes as string | null) ?? ''}
      dateIso={new Date().toISOString().slice(0, 10)}
      signerName={me?.full_name ?? ''}
      signerRole={me?.role ?? ''}
      rows={(items ?? []).map((i, n) => ({
        no: n + 1,
        sku: i.sku as string,
        name: info.get(i.sku as string)?.name ?? '',
        image_url: info.get(i.sku as string)?.image_url ?? null,
        spec: info.get(i.sku as string)?.spec ?? [],
        qty: Number(i.qty) || 0,
        uom: (i.uom as string | null) ?? '',
        drawing_code: (i.drawing_code as string | null) ?? '',
      }))}
    />
  );
}
