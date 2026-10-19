'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { getSOShippingStatus, shipItems } from './actions';

type ShippingRow = { id: string; sku: string; name: string; ordered: number; shipped: number; remaining: number };

export default function ShipItemsModal({ soId, onClose }: { soId: string; onClose: (didShip: boolean) => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ShippingRow[]>([]);
  const [shipQty, setShipQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [doDate, setDoDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSOShippingStatus(soId).then((data) => {
      setRows(data);
      setLoading(false);
    });
  }, [soId]);

  async function handleSubmit() {
    const payload = rows
      .map((r) => ({ sales_order_item_id: r.id, sku: r.sku, ship_qty: shipQty[r.id] || 0, notes: notes[r.id] || '' }))
      .filter((r) => r.ship_qty > 0);

    if (payload.length === 0) {
      toast('Mohon isi minimal satu Ship Qty.', 'error');
      return;
    }

    setSaving(true);
    const result = await shipItems(soId, doDate, payload);
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Data Delivery Order berhasil dibuat', 'success');
    onClose(true);
  }

  return (
    <Modal
      title="Ship Items"
      onClose={() => onClose(false)}
      footer={
        <>
          <button onClick={() => onClose(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Kirim & Buat Delivery Order'}
          </button>
        </>
      }
    >
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Pengiriman</label>
        <input
          type="date"
          value={doDate}
          onChange={(e) => setDoDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Memuat...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-2 font-semibold">SKU</th>
                <th className="py-2 pr-2 text-center font-semibold">Ordered</th>
                <th className="py-2 pr-2 text-center font-semibold">Shipped</th>
                <th className="py-2 pr-2 text-center font-semibold text-red-500">Sisa</th>
                <th className="py-2 pr-2 text-center font-semibold">Ship Qty</th>
                <th className="py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-2 pr-2">
                    <div className="font-mono text-[11px] font-semibold text-slate-700">{r.sku}</div>
                    <div className="text-[10px] text-slate-400">{r.name}</div>
                  </td>
                  <td className="py-2 pr-2 text-center">{r.ordered}</td>
                  <td className="py-2 pr-2 text-center">{r.shipped}</td>
                  <td className="py-2 pr-2 text-center font-semibold text-red-500">{r.remaining}</td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      max={r.remaining}
                      disabled={r.remaining <= 0}
                      value={shipQty[r.id] || 0}
                      onChange={(e) => setShipQty((prev) => ({ ...prev, [r.id]: parseFloat(e.target.value) || 0 }))}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs outline-none focus:border-brand-500 disabled:bg-slate-50"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      value={notes[r.id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="-"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
