import { listFinanceOptions } from '../finance/actions';
import FinanceOptionsTable from '../finance/FinanceOptionsTable';

export default async function Page() {
  const rows = await listFinanceOptions(['discount']);
  return <FinanceOptionsTable kind="discount" rows={rows} />;
}
