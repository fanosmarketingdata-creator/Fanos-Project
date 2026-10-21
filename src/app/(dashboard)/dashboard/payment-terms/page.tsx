import { listFinanceOptions } from '../finance/actions';
import FinanceOptionsTable from '../finance/FinanceOptionsTable';

export default async function Page() {
  const rows = await listFinanceOptions(['payment_term']);
  return <FinanceOptionsTable kind="payment_term" rows={rows} />;
}
