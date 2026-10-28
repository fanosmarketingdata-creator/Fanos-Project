'use client';

import RupiahInput from '@/components/ui/RupiahInput';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { ProductPickButton } from '@/components/registry/ProductPickerModal';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { type ProductOption } from '@/components/ProductPicker';
import { savePurchaseOrder, getSOItemsForPO, type PurchaseOrderInput, type POItemInput } from './actions';

export type VendorOption = { id: string; company: string };
export type SOOption = { id: string; label: string };

function emptyItem(): POItemInput {
  return { sku: '', description: '', qty: 1, uom: 'Pcs', unit_price: 0 };
}

export default function POForm({
  vendors,
  products,
  salesOrders = [],
  initial,
}: {
  vendors: VendorOption[];
  salesOrders?: SOOption[];
  products: ProductOption[];
  initial?: PurchaseOrderInput & { id?: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [poDate, setPoDate] = useState(initial?.po_date ?? new Date().toISOString().split('T')[0]);
  const [vendorId, setVendorId] = useState(initial?.vendor_id ?? '');
  const [soId, setSoId] = useState('');
  const [loadingSO, setLoadingSO] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<POItemInput[]>(initial?.items?.length ? initial.items : [emptyItem()]);

  function updateItem(i: number, patch: Partial<POItemInput>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  async function pickSO(id: string) {
    setSoId(id);
    if (!id) return;
    setLoadingSO(true);
    try {
      const list = await getSOItemsForPO(id);
      if (list.length === 0) return toast('Sales Order ini tidak memiliki item', 'error');
      setItems(list);
      const label = salesOrders.find((s) => s.id === id)?.label.split(' · ')[0];
      if (label && !notes) setNotes(`Berdasarkan Sales Order ${label}`);
      toast('Item dari Sales Order dimuat. Harga beli diambil dari Product Catalogue, silakan sesuaikan.', 'success');
    } catch (e) {
      toast('Item Sales Order gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoadingSO(false);
    }
  }

  const total = items.reduce((s, it) => s + it.qty * it.unit_price, 0);

  async function handleSave() {
    setSaving(true);
    const result = await savePurchaseOrder({
      id: initial?.id,
      po_date: poDate,
      vendor_id: vendorId,
      notes,
      sales_order_id: soId || null,
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
    <DocFormShell
      title={initial?.id ? 'Edit Purchase Order' : 'New Purchase Order'}
      icon="fi fi-rr-document"
      backHref="/dashboard/purchase-orders"
      saving={saving}
      saveLabel="Simpan"
      onSave={handleSave}
    >
      <Sec title="Informasi Purchase Order" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Vendor" required>
            <SearchSelect
              value={vendorId}
              onChange={(v) => setVendorId(v)}
              options={vendors.map((v) => ({ value: v.id, label: v.company }))}
              placeholder="Cari vendor..."
            />
          </FvField>
          {!initial?.id && salesOrders.length > 0 && (
            <FvField label="Tarik dari Sales Order (opsional)">
              <SearchSelect value={soId} onChange={pickSO} options={salesOrders.map((o) => ({ value: o.id, label: o.label }))} placeholder="Cari Sales Order..." />
            </FvField>
          )}
          <FvField label="Tanggal PO" required>
            <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
          </FvField>
          <FvField label="Catatan">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan pesanan" />
          </FvField>
        </div>
      </Sec>

      <Sec title="Daftar Item" icon="fi fi-rr-list">
        {loadingSO && <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Memuat item dari Sales Order...</p>}
        <div className="fv2-scroll-x">
          <div style={{ minWidth: 700 }}>
            <div className="fv2-item-head">
              <span style={{ flex: 2 }}>Produk (SKU)</span>
              <span style={{ width: 70 }}>Qty</span>
              <span style={{ width: 70 }}>UOM</span>
              <span style={{ flex: 1 }}>Harga Beli</span>
              <span style={{ flex: 1 }}>Subtotal</span>
              <span style={{ width: 30 }} />
            </div>
            {items.map((it, i) => (
              <div key={i} className="fv2-item-row">
                <div style={{ flex: 2 }}>
                  <ProductPickButton products={products} value={it.sku} onSelect={(p) => updateItem(i, { sku: p.sku, uom: p.uom, description: p.name, unit_price: Number(p.cost_price) || 0 })} />
                </div>
                <input type="number" style={{ width: 70, flex: 'none' }} value={it.qty} onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                <input style={{ width: 70, flex: 'none' }} value={it.uom} onChange={(e) => updateItem(i, { uom: e.target.value })} />
                <RupiahInput style={{ flex: 1 }} value={it.unit_price} onValue={(n) => updateItem(i, { unit_price: n })} />
                <input style={{ flex: 1 }} readOnly value={`Rp ${(it.qty * it.unit_price).toLocaleString('id-ID')}`} />
                <button type="button" className="fv2-del-btn" aria-label="Hapus item" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                  <i className="fi fi-rr-cross-small" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <button type="button" className="fv2-add-btn" onClick={() => setItems((prev) => [...prev, emptyItem()])}>
          <i className="fi fi-rr-plus" /> Tambah Item
        </button>
      </Sec>

      <div className="fv2-summary" style={{ maxWidth: 360, marginLeft: 'auto' }}>
        <div className="dv2-summary-row" style={{ fontSize: 15, fontWeight: 800, color: '#1a237e' }}>
          <span>Total</span>
          <span>Rp {total.toLocaleString('id-ID')}</span>
        </div>
      </div>
    </DocFormShell>
  );
}
