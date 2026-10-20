'use client';

import { useEffect, useState } from 'react';
import { FormModal, FvField } from '@/components/registry/RegistryModal';
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
    <FormModal
      title="Ship Items"
      icon="fi fi-rr-shipping-fast"
      maxWidth={860}
      onClose={() => onClose(false)}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving || loading}>
            <i className="fi fi-rr-shipping-fast" /> {saving ? 'Menyimpan...' : 'Kirim & Buat Delivery Order'}
          </button>
        </>
      }
    >
      <div className="fv2-section">
        <div className="fv2-grid">
          <FvField label="Tanggal Pengiriman" required>
            <input type="date" value={doDate} onChange={(e) => setDoDate(e.target.value)} />
          </FvField>
        </div>
      </div>

      {loading ? (
        <div className="dv2-loading"><div className="spinner" />Memuat data pengiriman...</div>
      ) : (
        <div className="dv2-table-wrap">
          <table className="dv2-table">
            <thead>
              <tr>
                <th className="tl">SKU</th>
                <th>Dipesan</th>
                <th>Terkirim</th>
                <th>Sisa</th>
                <th>Qty Kirim</th>
                <th className="tl">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="tl">
                    <div style={{ fontWeight: 700 }}>{r.sku}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.name}</div>
                  </td>
                  <td>{r.ordered}</td>
                  <td>{r.shipped}</td>
                  <td style={{ fontWeight: 700, color: '#dc2626' }}>{r.remaining}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={r.remaining}
                      disabled={r.remaining <= 0}
                      value={shipQty[r.id] || 0}
                      onChange={(e) => setShipQty((prev) => ({ ...prev, [r.id]: parseFloat(e.target.value) || 0 }))}
                      style={{ width: 80, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center', fontSize: 12.5 }}
                    />
                  </td>
                  <td className="tl">
                    <input
                      value={notes[r.id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="-"
                      style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FormModal>
  );
}
