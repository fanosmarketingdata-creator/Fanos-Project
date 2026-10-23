import { redirect } from 'next/navigation';

// Menu lama "Sales Return" sekarang menjadi Return > Order / Invoice / Credit Note.
export default function ReturnsIndex() {
  redirect('/dashboard/returns/order');
}
