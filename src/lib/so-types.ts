import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';

export type SOEditItem = {
  id?: string; // item SO yang sudah ada; kosong = item baru
  product_id: string | null;
  sku: string;
  name?: string;
  qty: number;
  qty_shipped?: number;
  unit_price: number;
  notes?: string;
};

export type SOFull = {
  id: string;
  doc_no: string | null;
  status: string;
  client_id: string;
  client_name: string;
  items: SOEditItem[];
  discounts: DiscountLine[];
  charges: ChargeLine[];
};

export type SOEdits = { items: SOEditItem[]; discounts: DiscountLine[]; charges: ChargeLine[] };
