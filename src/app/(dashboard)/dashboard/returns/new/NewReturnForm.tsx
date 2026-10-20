'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
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
    toast(`Retur berhasil disimpan. Credit Note sebesar Rp ${(result.creditAmount ?? 0).toLocaleString('id-ID')} telah diterbitkan`, 'success');
    router.push('/dashboard/returns');
  }

  return (
    <DocFormShell
      title="New Retur Penjualan"
      icon="fi fi-rr-undo"
      backHref="/dashboard/returns"
      saving={saving || creditTotal <= 0}
      saveLabel="Simpan Retur"
      onSave={handleSave}
    >
      <Sec title="Informasi Retur" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Invoice" required>
            <SearchSelect
              value={invoiceId}
              onChange={(v) => handlePickInvoice(v)}
              options={invoices.map((inv) => ({
                value: inv.id,
                label: inv.client_name,
                sub: `${new Date(inv.inv_date).toLocaleDateString('id-ID')} — Rp ${inv.grand_total.toLocaleString('id-ID')}`,
              }))}
              placeholder="Cari invoice..."
            />
          </FvField>
          <FvField label="Tanggal Retur" required>
            <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
          </FvField>
          <FvField label="Alasan">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Barang rusak atau tidak sesuai spesifikasi" />
          </FvField>
        </div>
      </Sec>

      {loading && <div className="dv2-loading"><div className="spinner" />Memuat item invoice...</div>}

      {items.length > 0 && (
        <Sec title="Item yang Diretur" icon="fi fi-rr-list">
          <div className="dv2-table-wrap">
            <table className="dv2-table">
              <thead>
                <tr>
                  <th className="tl">SKU</th>
                  <th>Di Invoice</th>
                  <th>Sudah Diretur</th>
                  <th>Dapat Diretur</th>
                  <th>Qty Retur</th>
                  <th className="tr">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.sku}>
                    <td className="tl">
                      <div style={{ fontWeight: 700 }}>{it.sku}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{it.name}</div>
                    </td>
                    <td>{it.invoiced}</td>
                    <td>{it.returned}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>{it.returnable}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={it.returnable}
                        disabled={it.returnable <= 0}
                        value={qty[it.sku] || 0}
                        onChange={(e) => setQty((prev) => ({ ...prev, [it.sku]: parseFloat(e.target.value) || 0 }))}
                        style={{ width: 80, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center', fontSize: 12.5 }}
                      />
                    </td>
                    <td className="tr">Rp {((qty[it.sku] || 0) * it.unit_price).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dv2-summary">
            <div className="dv2-summary-row" style={{ fontSize: 15, fontWeight: 800, color: '#1a237e' }}>
              <span>Credit Note yang akan terbit</span>
              <span>Rp {creditTotal.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </Sec>
      )}
    </DocFormShell>
  );
}
