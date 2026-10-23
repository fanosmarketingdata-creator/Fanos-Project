import { getPOsForInvoice } from '../actions';
import NewInvoiceForm from './NewInvoiceForm';

export default async function NewPurchaseInvoicePage({ searchParams }: { searchParams: { po?: string } }) {
  return <NewInvoiceForm pos={await getPOsForInvoice()} initialPo={searchParams.po ?? ''} />;
}
