import { listFinanceOptions } from '../finance/actions';
import FinanceOptionsTable from '../finance/FinanceOptionsTable';

export default async function Page() {
  const rows = await listFinanceOptions(['cashback']);
  return <FinanceOptionsTable kind="cashback" rows={rows} />;
}
