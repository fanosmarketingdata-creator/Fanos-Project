import { getInvoicesForReturn } from '../../actions';
import ReturnInvoiceForm from './ReturnInvoiceForm';

export default async function NewReturnInvoicePage() {
  return <ReturnInvoiceForm invoices={await getInvoicesForReturn()} />;
}
