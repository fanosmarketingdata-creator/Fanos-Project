import { getPOsForReceipt } from '../actions';
import NewReceiptForm from './NewReceiptForm';

export default async function NewPurchaseDeliveryPage({ searchParams }: { searchParams: { po?: string } }) {
  return <NewReceiptForm pos={await getPOsForReceipt()} initialPo={searchParams.po ?? ''} />;
}
