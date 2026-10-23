import { createClient } from '@/lib/supabase/server';
import PaymentForm from '../PaymentForm';
import { loadPayableInvoices } from '../data';

export default async function NewPaymentPage({ searchParams }: { searchParams: { invoice?: string } }) {
  const invoices = await loadPayableInvoices(createClient());
  return <PaymentForm invoices={invoices} presetInvoice={searchParams.invoice} />;
}
