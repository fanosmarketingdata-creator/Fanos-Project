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
import SOEditPanel from '@/components/registry/SOEditPanel';
import type { SOEdits } from '@/lib/so-types';
import { getSalesOrderFull } from '../../sales-orders/actions';
import { createManualDelivery, createDeliveryFromSO, type ManualDOItem } from '../actions';

type SOOption = { id: string; doc_no: string; so_date: string; client_name: string };
type ClientOption = { id: string; project_name: string };

const emptyItem = (): ManualDOItem => ({ product_id: null, sku: '', qty: 1, notes: '' });

export default function NewDeliveryForm({ salesOrders, clients, products }: { salesOrders: SOOption[]; clients: ClientOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<'manual' | 'so'>('so');
  const [docNo, setDocNo] = useState('');
  const [doDate, setDoDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Dari Sales Order
  const [soId, setSoId] = useState('');
  const [edits, setEdits] = useState<SOEdits | null>(null);
  const [original, setOriginal] = useState('');
  const [shipQty, setShipQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  // Manual
  const [clientId, setClientId] = useState('');
  const [items, setItems] = useState<ManualDOItem[]>([emptyItem()]);

  async function pickSO(id: string) {
    setSoId(id);
    setEdits(null);
    setShipQty({});
    if (!id) return;
    setLoading(true);
    try {
      const so = await getSalesOrderFull(id);
      if (!so) return toast('Sales Order tidak ditemukan', 'error');
      const e: SOEdits = { items: so.items, discounts: so.discounts, charges: so.charges };
      setEdits(e);
      setOriginal(JSON.stringify(e));
      setShipQty(Object.fromEntries(so.items.map((it) => [it.id as string, Math.max(0, it.qty - (it.qty_shipped ?? 0))])));
    } catch (e) {
      toast('Item Sales Order gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const updateItem = (i: number, patch: Partial<ManualDOItem>) => setItems((p) => p.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const ready = mode === 'so' ? !!soId && !!edits && edits.items.some((it) => it.id && (shipQty[it.id] || 0) > 0) : !!clientId && items.some((it) => it.sku && it.qty > 0);

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === 'so') {
        const payload = (edits?.items ?? [])
          .filter((it) => it.id && (shipQty[it.id] || 0) > 0)
          .map((it) => ({ sales_order_item_id: it.id as string, sku: it.sku, ship_qty: shipQty[it.id as string] || 0 }));
        const changed = edits && JSON.stringify(edits) !== original;
        const r = await createDeliveryFromSO({ so_id: soId, doc_no: docNo, do_date: doDate, notes, edits: changed ? edits : undefined, ship: payload });
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
              <option value="so">Dari Sales Order</option>
              <option value="manual">Input Manual (tanpa Sales Order)</option>
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
        <>
          {loading && <div className="dv2-loading"><div className="spinner" />Memuat data Sales Order...</div>}
          {!loading && !edits && (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              Pilih Sales Order untuk menampilkan datanya. Hanya Sales Order berstatus VERIFIED yang tampil. Data dapat diedit dan perubahannya juga disimpan ke Sales Order.
            </p>
          )}
          {edits && (
            <SOEditPanel
              value={edits}
              onChange={setEdits}
              products={products}
              allowAddRemove={false}
              shipQty={shipQty}
              onShipQty={(id, q) => setShipQty((p) => ({ ...p, [id]: q }))}
            />
          )}
        </>
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
