import { listFinanceOptions } from '../finance/actions';
import FinanceOptionsTable from '../finance/FinanceOptionsTable';

export default async function Page() {
  const rows = await listFinanceOptions(['credit_limit']);
  return <FinanceOptionsTable kind="credit_limit" rows={rows} />;
}
