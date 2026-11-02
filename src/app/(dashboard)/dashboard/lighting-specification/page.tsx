import { createClient } from '@/lib/supabase/server';
import { orThrow } from '@/lib/query';
import LightingSpecTable, { type SpecRow, type SpecItemRow, type BoqOption } from './LightingSpecTable';

const specKey = (it: { product_id?: string | null; sku: string; uom?: string | null }) =>
  `${it.product_id ?? ''}|${it.sku}|${(it.uom ?? '').toLowerCase()}`;

type BoqItem = { boq_project_id: string; sku: string; qty: number; uom: string | null; product_id: string | null };

export default async function LightingSpecificationPage() {
  const supabase = createClient();
  const specs = orThrow(await supabase
    .from('lighting_specifications')
    .select('id, boq_project_id, notes, updated_at, boq_projects(project_name, status, clients(company, project_name))')
    .order('updated_at', { ascending: false })).data ?? [];
  const boqs = orThrow(await supabase
    .from('boq_projects')
    .select('id, project_name, status, clients(company, project_name)')
    .neq('status', 'CANCELLED')
    .order('created_at', { ascending: false })).data ?? [];

  const specIds = specs.map((s) => s.id as string);
  const boqIds = specs.map((s) => s.boq_project_id as string);
  const [itemsRes, boqItemsRes] = specIds.length
    ? await Promise.all([
        supabase.from('lighting_specification_items').select('id, spec_id, product_id, sku, uom, qty, drawing_code, sort_order').in('spec_id', specIds).order('sort_order'),
        supabase.from('boq_project_items').select('boq_project_id, sku, qty, uom, product_id, sort_order').in('boq_project_id', boqIds).order('sort_order'),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  orThrow(itemsRes as { error: { message: string } | null });
  orThrow(boqItemsRes as { error: { message: string } | null });
  const items = (itemsRes.data ?? []) as { id: string; spec_id: string; product_id: string | null; sku: string; uom: string | null; qty: number; drawing_code: string | null }[];
  const boqItems = (boqItemsRes.data ?? []) as BoqItem[];

  const skus = Array.from(new Set([...items.map((i) => i.sku), ...boqItems.map((i) => i.sku)]));
  const names = new Map<string, string>();
  if (skus.length) {
    const { data: prods } = await supabase.from('products').select('sku, name').in('sku', skus);
    (prods ?? []).forEach((p) => names.set(p.sku as string, p.name as string));
  }

  const rows: SpecRow[] = specs.map((s) => {
    const boq = s.boq_projects as unknown as { project_name: string; status: string; clients: { company: string | null; project_name: string } | null } | null;
    // Sintesis BOQ terbaru per SKU
    const live = new Map<string, { product_id: string | null; sku: string; uom: string; qty: number }>();
    boqItems.filter((b) => b.boq_project_id === s.boq_project_id).forEach((b) => {
      const row = { product_id: b.product_id, sku: b.sku, uom: b.uom ?? '' };
      const k = specKey(row);
      const cur = live.get(k);
      if (cur) cur.qty += Number(b.qty) || 0;
      else live.set(k, { ...row, qty: Number(b.qty) || 0 });
    });
    const mine = items.filter((i) => i.spec_id === s.id);
    const seen = new Set<string>();
    const out: SpecItemRow[] = mine.map((i) => {
      const k = specKey(i);
      seen.add(k);
      const l = live.get(k);
      const flag: SpecItemRow['flag'] = !l ? 'removed' : Number(l.qty) !== Number(i.qty) ? 'qty' : null;
      return { key: k, product_id: i.product_id, sku: i.sku, name: names.get(i.sku) ?? '', uom: i.uom ?? '', qty: Number(i.qty), boq_qty: l ? l.qty : null, drawing_code: i.drawing_code ?? '', flag };
    });
    live.forEach((l, k) => {
      if (!seen.has(k)) out.push({ key: k, product_id: l.product_id, sku: l.sku, name: names.get(l.sku) ?? '', uom: l.uom, qty: 0, boq_qty: l.qty, drawing_code: '', flag: 'new' });
    });
    return {
      id: s.id as string,
      boq_project_id: s.boq_project_id as string,
      project_name: boq?.project_name ?? '-',
      client: boq?.clients?.company || boq?.clients?.project_name || '-',
      notes: (s.notes as string | null) ?? '',
      items: out,
      outdated: out.some((o) => o.flag),
    };
  });

  const used = new Set(rows.map((r) => r.boq_project_id));
  const options: BoqOption[] = boqs
    .filter((b) => !used.has(b.id as string))
    .map((b) => {
      const c = b.clients as unknown as { company: string | null; project_name: string } | null;
      return { value: b.id as string, label: `${b.project_name}${c ? ' — ' + (c.company || c.project_name) : ''}` };
    });

  return <LightingSpecTable initialRows={rows} boqOptions={options} />;
}
