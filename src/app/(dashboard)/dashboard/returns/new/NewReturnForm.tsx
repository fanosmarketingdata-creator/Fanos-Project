'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { getReturnableItems, createReturn } from '../actions';

type InvoiceOption = { id: string; inv_date: string; grand_total: number; client_name: string };
type ReturnableItem = {
  sku: string;
  name: string;
  invoiced: number;
  returned: number;
  returnable: number;
  unit_price: number;
};

export default function NewReturnForm({ invoices }: { invoices: InvoiceOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [invoiceId, setInvoiceId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handlePickInvoice(id: string) {
    setInvoiceId(id);
    setItems([]);
    setQty({});
    if (!id) return;
    setLoading(true);
    const data = await getReturnableItems(id);
    setLoading(false);
    setItems(data);
  }

  const creditTotal = items.reduce((s, it) => s + (qty[it.sku] || 0) * it.unit_price, 0);

  async function handleSave() {
    setSaving(true);
    const result = await createReturn(
      invoiceId,
      returnDate,
      reason,
      items.map((it) => ({ sku: it.sku, qty_returned: qty[it.sku] || 0, unit_price: it.unit_price }))
    );
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(`Retur tersimpan. Credit Note Rp ${(result.creditAmount ?? 0).toLocaleString('id-ID')} diterbitkan`, 'success');
    router.push('/dashboard/returns');
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Invoice *</label>
            <select
              value={invoiceId}
              onChange={(e) => handlePickInvoice(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="">-- Pilih Invoice --</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.client_name} — {new Date(inv.inv_date).toLocaleDateString('id-ID')} — Rp {inv.grand_total.toLocaleString('id-ID')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Retur *</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Alasan</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="mis. Barang rusak / tidak sesuai"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {loading && <p className="py-6 text-center text-sm text-slate-400">Memuat item invoice...</p>}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 text-center font-semibold">Di Invoice</th>
                <th className="px-4 py-3 text-center font-semibold">Sudah Diretur</th>
                <th className="px-4 py-3 text-center font-semibold text-emerald-600">Bisa Diretur</th>
                <th className="px-4 py-3 text-center font-semibold">Qty Retur</th>
                <th className="px-4 py-3 text-right font-semibold">Nilai</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.sku} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-slate-700">{it.sku}</div>
                    <div className="text-[11px] text-slate-400">{it.name}</div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{it.invoiced}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{it.returned}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-600">{it.returnable}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min={0}
                      max={it.returnable}
                      disabled={it.returnable <= 0}
                      value={qty[it.sku] || 0}
                      onChange={(e) => setQty((prev) => ({ ...prev, [it.sku]: parseFloat(e.target.value) || 0 }))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-brand-500 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    Rp {((qty[it.sku] || 0) * it.unit_price).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Credit Note yang akan terbit: <strong className="text-slate-800">Rp {creditTotal.toLocaleString('id-ID')}</strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard/returns')}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || creditTotal <= 0}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Retur'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
