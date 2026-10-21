// Konfigurasi master Finance. Satu tabel (finance_options) dipakai semua jenis.
export type FinanceKind = 'discount' | 'tax' | 'cashback' | 'payment_method' | 'payment_term' | 'credit_limit';
export type ValueMode = 'none' | 'percent' | 'amount';

export const FINANCE_KINDS: Record<FinanceKind, { title: string; icon: string; mode: ValueMode; valueLabel?: string; nameLabel: string; example: string }> = {
  discount: { title: 'Discount', icon: 'fi fi-rr-percentage', mode: 'percent', valueLabel: 'Persentase (%)', nameLabel: 'Discount Name', example: 'Contoh: Diskon Proyek' },
  tax: { title: 'Tax', icon: 'fi fi-rr-calculator', mode: 'percent', valueLabel: 'Persentase (%)', nameLabel: 'Tax Name', example: 'Contoh: PPN 11%' },
  cashback: { title: 'Cashback', icon: 'fi fi-rr-coins', mode: 'percent', valueLabel: 'Persentase (%)', nameLabel: 'Cashback Name', example: 'Contoh: Cashback 2%' },
  payment_method: { title: 'Payment Method', icon: 'fi fi-rr-credit-card', mode: 'none', nameLabel: 'Payment Method', example: 'Contoh: Transfer Bank' },
  payment_term: { title: 'Payment Term', icon: 'fi fi-rr-calendar-clock', mode: 'none', nameLabel: 'Payment Term', example: 'Contoh: Net 30 Hari' },
  credit_limit: { title: 'Credit Limit', icon: 'fi fi-rr-hand-holding-usd', mode: 'amount', valueLabel: 'Nominal (Rp)', nameLabel: 'Label', example: 'Otomatis: Rp 10.000.000' },
};

export type FinanceOption = { id: string; kind: FinanceKind; name: string; value: number | null };

export const rupiahLabel = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
