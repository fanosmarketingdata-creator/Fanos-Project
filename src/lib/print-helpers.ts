import { rupiah } from '@/lib/format';

export type PrintClient = {
  project_name: string;
  company?: string | null;
  contact_name?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
} | null;

// Relasi 1-banyak/1-1 dari Supabase kadang terbaca array: ambil elemen pertama.
export function one<T>(v: unknown): T | null {
  if (Array.isArray(v)) return (v[0] as T) ?? null;
  return (v as T) ?? null;
}

export function clientLines(c: PrintClient) {
  if (!c) return ['-'];
  const lines = [c.project_name];
  if (c.company) lines.push(c.company);
  const addr = [c.address, c.city].filter(Boolean).join(', ');
  if (addr) lines.push(addr);
  const contact = [c.contact_name && `Up: ${c.contact_name}`, c.phone].filter(Boolean).join(' ');
  if (contact) lines.push(contact);
  return lines;
}

type Discount = { label: string; percent: number };
type Charge = { label: string; amount: number };

// Sama dengan rumus di form: total diskon = jumlah persen semua baris diskon.
export function buildTotals(subtotal: number, discounts: Discount[] = [], charges: Charge[] = [], finalLabel = 'Total') {
  const rows: { label: string; value: string; bold?: boolean }[] = [{ label: 'Sub Total :', value: rupiah(subtotal) }];

  let discountTotal = 0;
  discounts.forEach((d) => {
    const amt = (subtotal * (d.percent || 0)) / 100;
    discountTotal += amt;
    rows.push({ label: `Disc${d.label ? ` ${d.label}` : ''} (${d.percent}%):`, value: `-${rupiah(amt)}` });
  });

  let chargeTotal = 0;
  charges.forEach((c) => {
    chargeTotal += c.amount || 0;
    rows.push({ label: `${c.label || 'Biaya'} :`, value: rupiah(c.amount) });
  });

  const total = subtotal - discountTotal + chargeTotal;
  rows.push({ label: `${finalLabel}:`, value: rupiah(total), bold: true });
  return { rows, total };
}
