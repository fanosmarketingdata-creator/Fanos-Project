import { getUninvoicedSalesOrders } from '../actions';
import NewInvoiceForm from './NewInvoiceForm';

export default async function NewInvoicePage() {
  const sos = await getUninvoicedSalesOrders();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Buat Invoice</h1>
      <p className="mb-6 text-sm text-slate-500">Pilih Sales Order — item &amp; harga ditarik otomatis.</p>
      <NewInvoiceForm salesOrders={sos} />
    </div>
  );
}
