import { getUninvoicedSalesOrders } from '../actions';
import NewInvoiceForm from './NewInvoiceForm';

export default async function NewInvoicePage() {
  const sos = await getUninvoicedSalesOrders();

  return (
    <NewInvoiceForm salesOrders={sos} />
  );
}
