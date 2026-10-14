'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import ProductPicker, { type ProductOption } from '@/components/ProductPicker';
import { DiscountEditor, ChargeEditor } from '@/components/DiscountChargeEditor';
import { sumDiscountPercent, sumChargeAmount } from '@/lib/discount-charge';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import { saveSalesOrder, getBOQItemsForSO, type SalesOrderInput, type SOItemInput } from './actions';

export type ClientOption = { id: string; project_name: string };
export type BOQOption = { id: string; project_name: string };

function emptyItem(): SOItemInput {
  return { product_id: null, sku: '', qty: 1, unit_price: 0, notes: '' };
}

export default function SalesOrderForm({
  clients,
  products,
  boqProjects,
  initial,
}: {
  clients: ClientOption[];
  products: ProductOption[];
  boqProjects: BOQOption[];
  initial?: SalesOrderInput & { id?: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingBOQ, setLoadingBOQ] = useState(false);

  const [mode, setMode] = useState<'manual' | 'boq'>(initial?.mode ?? 'manual');
  const [soDate, setSoDate] = useState(initial?.so_date ?? new Date().toISOString().split('T')[0]);
  const [boqProjectId, setBoqProjectId] = useState(initial?.boq_project_id ?? '');
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [globalNotes, setGlobalNotes] = useState(initial?.global_notes ?? '');
  const [items, setItems] = useState<SOItemInput[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [discounts, setDiscounts] = useState<DiscountLine[]>(initial?.discounts ?? []);
  const [charges, setCharges] = useState<ChargeLine[]>(initial?.charges ?? []);

  async function handlePickBOQ(id: string) {
    setBoqProjectId(id);
    if (!id) return;
    setLoadingBOQ(true);
    const { items: boqItems, clientId: boqClientId } = await getBOQItemsForSO(id);
    setLoadingBOQ(false);
    setClientId(boqClientId);
    setItems(boqItems.map((it) => ({ product_id: it.product_id, sku: it.sku, qty: Number(it.qty), unit_price: 0, notes: '' })));
  }

  function updateItem(i: number, patch: Partial<SOItemInput>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, j) => j !== i));
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(discounts);
  const afterDiscount = subtotal * (1 - discountPercent / 100);
  const total = afterDiscount + sumChargeAmount(charges);

  async function handleSave() {
    setSaving(true);
    const result = await saveSalesOrder({
      id: initial?.id,
      mode,
      so_date: soDate,
      boq_project_id: mode === 'boq' ? boqProjectId : null,
      client_id: clientId,
      discounts,
      charges,
      global_notes: globalNotes,
      items,
    });
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(initial?.id ? 'Sales Order diperbarui' : 'Sales Order ditambahkan', 'success');
    router.push('/dashboard/sales-orders');
  }

  return (
    <div className="pb-10">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4">
          {!initial?.id && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'manual' | 'boq')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="manual">Manual</option>
                <option value="boq">Dari BOQ Project (langsung, tanpa quotation)</option>
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal SO *</label>
            <input
              type="date"
              value={soDate}
              onChange={(e) => setSoDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {mode === 'boq' && !initial?.id ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">BOQ Project *</label>
              <select
                value={boqProjectId}
                onChange={(e) => handlePickBOQ(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">-- Pilih BOQ Project --</option>
                {boqProjects.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.project_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">-- Pilih Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.project_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Catatan Umum</label>
            <input
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Item</h3>
          {loadingBOQ && <span className="text-xs text-slate-400">Memuat item dari BOQ...</span>}
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[2fr_60px_1fr_1fr_1fr_auto] gap-2 px-1 text-[10px] font-semibold uppercase text-slate-400">
            <span>SKU</span>
            <span>Qty</span>
            <span>Harga Satuan</span>
            <span>Subtotal</span>
            <span>Notes</span>
            <span></span>
          </div>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[2fr_60px_1fr_1fr_1fr_auto] items-center gap-2">
              <ProductPicker products={products} value={it.sku} onSelect={(p) => updateItem(i, { product_id: p.id, sku: p.sku })} />
              <input
                type="number"
                value={it.qty}
                onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <input
                type="number"
                value={it.unit_price}
                onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <span className="px-2 text-sm text-slate-600">Rp {(it.qty * it.unit_price).toLocaleString('id-ID')}</span>
              <input
                value={it.notes}
                onChange={(e) => updateItem(i, { notes: e.target.value })}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
              />
              <button onClick={() => removeItem(i)} className="shrink-0 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100">
                ✕
              </button>
            </div>
          ))}
        </div>
        {mode === 'manual' && (
          <button onClick={addItem} className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700">
            + Tambah Item
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-5">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <DiscountEditor lines={discounts} onChange={setDiscounts} />
          <ChargeEditor lines={charges} onChange={setCharges} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-700">Ringkasan</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Diskon ({discountPercent}%)</span>
              <span>- Rp {(subtotal - afterDiscount).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Tambahan</span>
              <span>Rp {sumChargeAmount(charges).toLocaleString('id-ID')}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-800">
              <span>Total</span>
              <span>Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
        <button
          onClick={() => router.push('/dashboard/sales-orders')}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan Sales Order'}
        </button>
      </div>
    </div>
  );
}
