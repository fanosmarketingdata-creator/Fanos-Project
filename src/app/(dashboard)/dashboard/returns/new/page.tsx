import { getInvoicesForReturn } from '../actions';
import NewReturnForm from './NewReturnForm';

export default async function NewReturnPage() {
  const invoices = await getInvoicesForReturn();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Buat Retur Penjualan</h1>
      <p className="mb-6 text-sm text-slate-500">Pilih invoice, lalu isi qty barang yang dikembalikan.</p>
      <NewReturnForm invoices={invoices} />
    </div>
  );
}
