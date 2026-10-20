'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { generateAkumulasi, updateAkumulasiQty } from '../actions';

export type AkumulasiRow = { id: string; sku: string; qty: number; uom: string | null };

export default function AkumulasiDetailTable({
  boqProjectId,
  initialRows,
}: {
  boqProjectId: string;
  initialRows: AkumulasiRow[];
}) {
  const toast = useToast();
  const [rows, setRows] = useState(initialRows);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleQtyChange(id: string, qty: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, qty } : r)));
  }

  async function handleQtyBlur(id: string, qty: number) {
    setSavingId(id);
    const result = await updateAkumulasiQty(id, qty);
    setSavingId(null);
    if (result.error) toast(result.error, 'error');
  }

  async function handleRefresh() {
    setRefreshing(true);
    const result = await generateAkumulasi(boqProjectId);
    setRefreshing(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Akumulasi berhasil diperbarui sesuai BOQ Project terbaru', 'success');
    window.location.reload();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button type="button" className="fv2-add-btn" style={{ marginTop: 0 }} onClick={handleRefresh} disabled={refreshing}>
          <i className="fi fi-rr-refresh" /> {refreshing ? 'Memproses...' : 'Refresh dari BOQ Project'}
        </button>
      </div>

      <div className="dv2-table-wrap">
        <table className="dv2-table">
          <thead>
            <tr>
              <th className="tl">SKU</th>
              <th>Total Qty</th>
              <th>UOM</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3}>Belum terdapat data</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="tl" style={{ fontWeight: 700 }}>{r.sku}</td>
                <td>
                  <input
                    type="number"
                    value={r.qty}
                    onChange={(e) => handleQtyChange(r.id, parseFloat(e.target.value) || 0)}
                    onBlur={(e) => handleQtyBlur(r.id, parseFloat(e.target.value) || 0)}
                    style={{ width: 110, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', textAlign: 'center', fontSize: 12.5 }}
                  />
                  {savingId === r.id && <span style={{ marginLeft: 8, fontSize: 11, color: '#9ca3af' }}>menyimpan...</span>}
                </td>
                <td>{r.uom || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 11.5, color: '#9ca3af' }}>
        Angka qty dapat diubah secara manual (misalnya untuk menambah cadangan stok). Pilih &quot;Refresh dari BOQ Project&quot;
        untuk menghitung ulang berdasarkan item BOQ Project terbaru; perubahan manual akan tertimpa.
      </p>
    </div>
  );
}
