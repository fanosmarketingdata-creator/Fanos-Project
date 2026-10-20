import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuotationForm from '../QuotationForm';
import type { QuotationInput } from '../actions';

export default async function EditQuotationPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: quote }, { data: items }, { data: clients }, { data: products }, { data: boqProjects }] =
    await Promise.all([
      supabase.from('quotations').select('*').eq('id', params.id).single(),
      supabase
        .from('quotation_items')
        .select('product_id, sku, description, qty, uom, unit_price')
        .eq('quotation_id', params.id)
        .order('sort_order'),
      supabase.from('clients').select('id, project_name').order('project_name'),
      supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
      supabase.from('boq_projects').select('id, project_name').order('boq_date', { ascending: false }),
    ]);

  if (!quote) notFound();
  if (quote.status !== 'DRAFT') notFound(); // hanya DRAFT yang bisa diedit

  const initial: QuotationInput & { id: string } = {
    id: quote.id,
    mode: quote.boq_project_id ? 'boq' : 'manual',
    quote_date: quote.quote_date,
    validity_date: quote.validity_date ?? '',
    boq_project_id: quote.boq_project_id,
    client_id: quote.client_id,
    discounts: quote.discounts ?? [],
    charges: quote.charges ?? [],
    items: (items ?? []).map((it) => ({
      product_id: it.product_id,
      sku: it.sku,
      description: it.description ?? '',
      qty: Number(it.qty),
      uom: it.uom ?? '',
      unit_price: Number(it.unit_price),
    })),
  };

  return (
    <QuotationForm clients={clients ?? []} products={products ?? []} boqProjects={boqProjects ?? []} initial={initial} />
  );
}
