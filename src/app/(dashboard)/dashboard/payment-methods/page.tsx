import { listFinanceOptions } from '../finance/actions';
import FinanceOptionsTable from '../finance/FinanceOptionsTable';

export default async function Page() {
  const rows = await listFinanceOptions(['payment_method']);
  return <FinanceOptionsTable kind="payment_method" rows={rows} />;
}
