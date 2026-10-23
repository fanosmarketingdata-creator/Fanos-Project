import { getVerifiedSalesOrders } from '../actions';
import NewPackingForm from './NewPackingForm';

export default async function NewPackingListPage() {
  return <NewPackingForm salesOrders={await getVerifiedSalesOrders()} />;
}
