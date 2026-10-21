'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { ProductPickButton } from '@/components/registry/ProductPickerModal';
import Select from '@/components/ui/Select';
import type { ProductOption } from '@/components/ProductPicker';
import { getSOShippingStatus, shipItems } from '../../sales-orders/actions';
import { createManualDelivery, type ManualDOItem } from '../actions';

type SOOption = { id: string; doc_no: string; so_date: string; client_name: string };
type ClientOption = { id: string; project_name: string };
type ShipRow = { id: string; sku: string; name: string; ordered: number; shipped: number; remaining: number };

const emptyItem = (): ManualDOItem => ({ product_id: null, sku: '', qty: 1, notes: '' });

export default function NewDeliveryForm({ salesOrders, clients, products }: { salesOrders: SOOption[]; clients: ClientOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<'manual' | 'so'>('manual');
  const [docNo, setDocNo] = useState('');
  const [doDate, setDoDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Dari Sales Order
  const [soId, setSoId] = useState('');
  const [rows, setRows] = useState<ShipRow[]>([]);
  const [shipQty, setShipQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Manual
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<ManualDOItem[]>([emptyItem()]);

  async function pickSO(id: string) {
    setSoId(id);
    setRows([]);
    setShipQty({});
    if (!id) return;
    setLoading(true);
    try {
      const data = await getSOShippingStatus(id);
      setRows(data);
      setShipQty(Object.fromEntries(data.map((r) => [r.id, r.remaining])));
    } catch (e) {
      toast('Item Sales Order gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const updateItem = (i: number, patch: Partial<ManualDOItem>) => setItems((p) => p.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const ready = mode === 'so' ? !!soId && rows.some((r) => (shipQty[r.id] || 0) > 0) : !!clientId && items.some((it) => it.sku && it.qty > 0);

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === 'so') {
        const payload = rows.map((r) => ({ sales_order_item_id: r.id, sku: r.sku, ship_qty: shipQty[r.id] || 0 })).filter((r) => r.ship_qty > 0);
        const r = await shipItems(soId, doDate, payload, docNo, notes);
        if (r.error) return toast(r.error, 'error');
      } else {
        const r = await createManualDelivery({ doc_no: docNo, do_date: doDate, client_id: clientId, notes, items });
        if (r.error) return toast(r.error, 'error');
      }
      toast('Data Delivery Order berhasil dibuat', 'success');
      router.push('/dashboard/delivery-orders');
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell
      title="New Delivery Order"
      icon="fi fi-rr-shipping-fast"
      backHref="/dashboard/delivery-orders"
      saving={saving}
      disabled={!ready}
      saveLabel="Simpan"
      onSave={handleSave}
    >
      <Sec title="Informasi Pengiriman" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Delivery ID">
            <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (DO-...)" />
          </FvField>
          <FvField label="Tanggal Kirim" required>
            <input type="date" value={doDate} onChange={(e) => setDoDate(e.target.value)} />
          </FvField>
          <FvField label="Sumber Data">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'manual' | 'so')}>
              <option value="manual">Input Manual (tanpa Sales Order)</option>
              <option value="so">Dari Sales Order</option>
            </Select>
          </FvField>
          {mode === 'so' ? (
            <FvField label="Sales Order" required>
              <SearchSelect
                value={soId}
                onChange={pickSO}
                options={salesOrders.map((so) => ({
                  value: so.id,
                  label: `${so.doc_no || 'SO'} — ${so.client_name}`,
                  sub: new Date(so.so_date).toLocaleDateString('id-ID'),
                }))}
                placeholder="Cari sales order..."
              />
            </FvField>
          ) : (
            <FvField label="Client" required>
              <SearchSelect
                value={clientId}
                onChange={(v) => setClientId(v)}
                options={clients.map((c) => ({ value: c.id, label: c.project_name }))}
                placeholder="Cari client..."
              />
            </FvField>
          )}
          <FvField label="Catatan">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan pengiriman (opsional)" />
          </FvField>
        </div>
      </Sec>

      {mode === 'so' ? (
        <Sec title="Item yang Dikirim" icon="fi fi-rr-list">
          {loading && <p style={{ fontSize: 12, color: '#9ca3af' }}>Memuat item Sales Order...</p>}
          {!loading && rows.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>Pilih Sales Order untuk menampilkan item yang masih bisa dikirim.</p>}
          {rows.length > 0 && (
            <div className="dv2-table-wrap">
              <table className="dv2-table">
                <thead>
                  <tr><th className="tl">SKU</th><th>Dipesan</th><th>Terkirim</th><th>Sisa</th><th>Ship Qty</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="tl"><div style={{ fontWeight: 700 }}>{r.sku}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{r.name}</div></td>
                      <td>{r.ordered}</td>
                      <td>{r.shipped}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>{r.remaining}</td>
                      <td>
                        <input
                          type="number" min={0} max={r.remaining} disabled={r.remaining <= 0}
                          value={shipQty[r.id] || 0}
                          onChange={(e) => setShipQty((p) => ({ ...p, [r.id]: parseFloat(e.target.value) || 0 }))}
                          style={{ width: 80, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center', fontSize: 12.5 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Sec>
      ) : (
        <Sec title="Daftar Item" icon="fi fi-rr-list">
          <div className="fv2-scroll-x">
            <div style={{ minWidth: 560 }}>
              <div className="fv2-item-head">
                <span style={{ flex: 2 }}>Produk (SKU)</span>
                <span style={{ width: 80 }}>Qty</span>
                <span style={{ flex: 1 }}>Catatan</span>
                <span style={{ width: 30 }} />
              </div>
              {items.map((it, i) => (
                <div key={i} className="fv2-item-row">
                  <div style={{ flex: 2 }}>
                    <ProductPickButton products={products} value={it.sku} onSelect={(p) => updateItem(i, { product_id: p.id, sku: p.sku })} />
                  </div>
                  <input type="number" style={{ width: 80, flex: 'none' }} value={it.qty} onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                  <input style={{ flex: 1 }} value={it.notes ?? ''} onChange={(e) => updateItem(i, { notes: e.target.value })} />
                  <button type="button" className="fv2-del-btn" aria-label="Hapus item" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}>
                    <i className="fi fi-rr-cross-small" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="fv2-add-btn" onClick={() => setItems((p) => [...p, emptyItem()])}>
            <i className="fi fi-rr-plus" /> Tambah Item
          </button>
        </Sec>
      )}
    </DocFormShell>
  );
}
