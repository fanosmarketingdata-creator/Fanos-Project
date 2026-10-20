'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
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
          <FvField label="Tanggal PO" required>
            <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
          </FvField>
          <FvField label="Catatan">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan pesanan" />
          </FvField>
        </div>
      </Sec>

      <Sec title="Daftar Item" icon="fi fi-rr-list">
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
                  <ProductPicker products={products} value={it.sku} onSelect={(p) => updateItem(i, { sku: p.sku, uom: p.uom, description: p.name })} />
                </div>
                <input type="number" style={{ width: 70, flex: 'none' }} value={it.qty} onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                <input style={{ width: 70, flex: 'none' }} value={it.uom} onChange={(e) => updateItem(i, { uom: e.target.value })} />
                <input type="number" style={{ flex: 1 }} value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: parseFloat(e.target.value) || 0 })} />
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
