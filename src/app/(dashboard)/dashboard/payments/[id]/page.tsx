import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PaymentForm from '../PaymentForm';
import { loadPayableInvoices } from '../data';

export default async function EditPaymentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase.from('payments').select('id, invoice_id, doc_no, pay_date, amount, discount, method, reference_no, notes').eq('id', params.id).single();
  if (!p) notFound();
  const invoices = await loadPayableInvoices(supabase, p.invoice_id);
  return (
    <PaymentForm
      invoices={invoices}
      initial={{ ...p, amount: Number(p.amount), discount: Number(p.discount ?? 0) }}
    />
  );
}
