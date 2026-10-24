import { createClient } from '@/lib/supabase/server';
import InvoiceTable from './InvoiceTable';

export default async function PurchaseInvoicePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('purchase_invoices')
    .select('id, doc_no, inv_date, due_date, vendor_invoice_no, status, grand_total, total_paid, remaining, vendors(company), purchase_orders(doc_no)')
    .order('inv_date', { ascending: false })
    .order('created_at', { ascending: false });
  const one = <T,>(v: unknown): T | null => (Array.isArray(v) ? (v[0] as T) : (v as T)) ?? null;
  const rows = (data ?? []).map((i) => ({
    id: i.id as string, doc_no: (i.doc_no as string | null) ?? null, inv_date: i.inv_date as string, due_date: (i.due_date as string | null) ?? null,
    vendor_invoice_no: (i.vendor_invoice_no as string | null) ?? null, status: i.status as string,
    grand_total: Number(i.grand_total), total_paid: Number(i.total_paid), remaining: Number(i.remaining),
    vendor: one<{ company: string }>(i.vendors)?.company ?? '-', po_no: one<{ doc_no: string }>(i.purchase_orders)?.doc_no ?? '-',
  }));
  return (
    <div>
      <InvoiceTable rows={rows} />
    </div>
  );
}
