import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintModal from '@/components/PrintModal';
import QuotationLetter from './QuotationLetter';
import { num } from '@/lib/format';
import { one, type PrintClient } from '@/lib/print-helpers';

export default async function QuotationPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: q }, { data: items }] = await Promise.all([
    supabase
      .from('quotations')
      .select('id, doc_no, quote_date, validity_date, project_name, discounts, charges, total_amount, clients(client_no, project_name, company, contact_name, address, city, phone), boq_projects(project_name)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('quotation_items')
      .select('sku, description, qty, uom, unit_price, subtotal')
      .eq('quotation_id', params.id)
      .order('sort_order'),
  ]);
  if (!q) notFound();

  const emptySkus = (items ?? []).filter((it) => !it.description && it.sku).map((it) => it.sku as string);
  const { data: pn } = emptySkus.length ? await supabase.from('products').select('sku, name').in('sku', emptySkus) : { data: [] as { sku: string; name: string }[] };
  const nameBySku = new Map((pn ?? []).map((x) => [x.sku, x.name]));

  const rows = (items ?? []).map((it, i) => ({
    no: i + 1,
    sku: it.sku,
    name: it.description || nameBySku.get(it.sku as string) || '',
    qty: num(it.qty),
    uom: it.uom ?? '',
    price: num(it.unit_price),
    total: num(it.subtotal),
  }));
  const subtotal = (items ?? []).reduce((s, it) => s + Number(it.subtotal), 0);

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user ? await supabase.from('profiles').select('full_name, role').eq('id', user.id).single() : { data: null };

  const { data: tpls } = await supabase.from('quotation_terms_templates').select('id, name, lang, content, is_default').order('name');

  const client = one<PrintClient & { client_no?: string | null }>(q.clients);
  const boq = one<{ project_name: string }>(q.boq_projects);

  return (
    <PrintModal backHref="/dashboard/quotations" showPrint={false} showBank={false} split>
      <QuotationLetter
        quoteId={q.id}
        docNo={q.doc_no ?? '-'}
        dateIso={String(q.quote_date).slice(0, 10)}
        company={client?.company || client?.project_name || '-'}
        clientNo={client?.client_no ?? ''}
        contactName={client?.contact_name ?? ''}
        project={boq?.project_name || q.project_name || client?.project_name || ''}
        rows={rows.map((r) => ({ no: r.no, sku: r.sku ?? '', name: r.name, qty: String(r.qty), uom: r.uom, price: 'Rp' + r.price, total: 'Rp' + r.total }))}
        subtotal={subtotal}
        discounts={q.discounts ?? []}
        charges={q.charges ?? []}
        signerName={me?.full_name ?? ''}
        signerRole={me?.role ?? ''}
      templates={(tpls ?? []) as { id: string; name: string; lang: 'id' | 'en'; content: string; is_default: boolean }[]}
      />
    </PrintModal>
  );
}
