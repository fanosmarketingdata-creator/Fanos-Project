import { listFinanceOptions } from '../finance/actions';
import FinanceOptionsTable from '../finance/FinanceOptionsTable';

export default async function Page() {
  const rows = await listFinanceOptions(['tax']);
  return <FinanceOptionsTable kind="tax" rows={rows} />;
}
