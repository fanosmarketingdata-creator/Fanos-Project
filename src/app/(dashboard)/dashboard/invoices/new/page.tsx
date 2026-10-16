import { getUninvoicedSalesOrders } from '../actions';
import NewInvoiceForm from './NewInvoiceForm';

export default async function NewInvoicePage() {
  const sos = await getUninvoicedSalesOrders();

  return (
    <div>
      <h1 className="page-title"><i className="fi fi-rr-receipt" />Buat Invoice</h1>
      <p className="mb-6 text-sm text-slate-500">Pilih Sales Order — item &amp; harga ditarik otomatis.</p>
      <NewInvoiceForm salesOrders={sos} />
    </div>
  );
}
