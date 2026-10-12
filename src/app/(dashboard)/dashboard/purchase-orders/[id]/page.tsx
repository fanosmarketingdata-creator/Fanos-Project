import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import POForm from '../POForm';
import type { PurchaseOrderInput } from '../actions';

export default async function EditPOPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: po }, { data: items }, { data: vendors }, { data: products }] = await Promise.all([
    supabase.from('purchase_orders').select('*').eq('id', params.id).single(),
    supabase
      .from('purchase_order_items')
      .select('sku, description, qty, uom, unit_price')
      .eq('purchase_order_id', params.id),
    supabase.from('vendors').select('id, company').order('company'),
    supabase.from('products').select('id, sku, name, uom').eq('is_active', true).order('sku'),
  ]);

  if (!po) notFound();
  if (po.status !== 'DRAFT') notFound(); // hanya DRAFT yang bisa diedit

  const initial: PurchaseOrderInput & { id: string } = {
    id: po.id,
    po_date: po.po_date,
    vendor_id: po.vendor_id,
    notes: po.notes ?? '',
    items: (items ?? []).map((it) => ({
      sku: it.sku,
      description: it.description ?? '',
      qty: Number(it.qty),
      uom: it.uom ?? '',
      unit_price: Number(it.unit_price),
    })),
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Edit Purchase Order</h1>
      <p className="mb-6 text-sm text-slate-500">Status: DRAFT</p>
      <POForm vendors={vendors ?? []} products={products ?? []} initial={initial} />
    </div>
  );
}
