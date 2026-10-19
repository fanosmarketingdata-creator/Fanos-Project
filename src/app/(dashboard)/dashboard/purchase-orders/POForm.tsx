'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import ProductPicker, { type ProductOption } from '@/components/ProductPicker';
import { savePurchaseOrder, type PurchaseOrderInput, type POItemInput } from './actions';

export type VendorOption = { id: string; company: string };

function emptyItem(): POItemInput {
  return { sku: '', description: '', qty: 1, uom: 'Pcs', unit_price: 0 };
}

export default function POForm({
  vendors,
  products,
  initial,
}: {
  vendors: VendorOption[];
  products: ProductOption[];
  initial?: PurchaseOrderInput & { id?: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [poDate, setPoDate] = useState(initial?.po_date ?? new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState(initial?.vendor_id ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<POItemInput[]>(initial?.items?.length ? initial.items : [emptyItem()]);

  function updateItem(i: number, patch: Partial<POItemInput>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  const total = items.reduce((s, it) => s + it.qty * it.unit_price, 0);

  async function handleSave() {
    setSaving(true);
    const result = await savePurchaseOrder({
      id: initial?.id,
      po_date: poDate,
      vendor_id: vendorId,
      notes,
      items,
    });
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(initial?.id ? 'Data PO berhasil diperbarui' : 'Data PO berhasil ditambahkan', 'success');
    router.push('/dashboard/purchase-orders');
  }

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Vendor *</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">-- Pilih Vendor --</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.company}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal PO *</label>
            <input
              type="date"
              value={poDate}
              onChange={(e) => setPoDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Catatan</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-700">Item</h3>
        <div className="space-y-2 overflow-x-auto pb-1">
          <div className="grid min-w-[680px] grid-cols-[2fr_60px_60px_1fr_1fr_auto] gap-2 px-1 text-[10px] font-semibold uppercase text-slate-400">
            <span>SKU</span>
            <span>Qty</span>
            <span>UOM</span>
            <span>Harga Beli</span>
            <span>Subtotal</span>
            <span></span>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid min-w-[680px] grid-cols-[2fr_60px_60px_1fr_1fr_auto] items-center gap-2">
              <ProductPicker
                products={products}
                value={it.sku}
                onSelect={(p) => updateItem(i, { sku: p.sku, uom: p.uom, description: p.name })}
              />
              <input
                type="number"
                value={it.qty}
                onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <input
                value={it.uom}
                onChange={(e) => updateItem(i, { uom: e.target.value })}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <input
                type="number"
                value={it.unit_price}
                onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <span className="px-2 text-sm text-slate-600">Rp {(it.qty * it.unit_price).toLocaleString('id-ID')}</span>
              <button
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                className="shrink-0 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setItems((prev) => [...prev, emptyItem()])}
          className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          + Tambah Item
        </button>

        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 text-base font-bold text-slate-800">
          Total: Rp {total.toLocaleString('id-ID')}
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
        <button
          onClick={() => router.push('/dashboard/purchase-orders')}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan PO'}
        </button>
      </div>
    </div>
  );
}
