import { getInvoicesForReturn } from '../../actions';
import ReturnOrderForm from './ReturnOrderForm';

export default async function NewReturnOrderPage() {
  return <ReturnOrderForm invoices={await getInvoicesForReturn()} />;
}
