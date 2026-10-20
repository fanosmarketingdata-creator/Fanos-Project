import { getInvoicesForReturn } from '../actions';
import NewReturnForm from './NewReturnForm';

export default async function NewReturnPage() {
  const invoices = await getInvoicesForReturn();

  return (
    <NewReturnForm invoices={invoices} />
  );
}
