'use client';

import { Sec, TotalsBox } from '@/components/registry/DocFormShell';
import { ProductPickButton } from '@/components/registry/ProductPickerModal';
import { DiscountEditor, ChargeEditor } from '@/components/DiscountChargeEditor';
import RupiahInput from '@/components/ui/RupiahInput';
import type { ProductOption } from '@/components/ProductPicker';
import { sumDiscountPercent, sumChargeAmount, sumTaxAmount, sumTaxPercent } from '@/lib/discount-charge';
import type { SOEdits, SOEditItem } from '@/lib/so-types';

// Data lengkap Sales Order yang bisa diedit di form Invoice / Delivery Order.
// Perubahan disimpan kembali ke Sales Order asalnya oleh server action.
export default function SOEditPanel({
  value,
  onChange,
  products,
  allowAddRemove = true,
  shipQty,
  onShipQty,
}: {
  value: SOEdits;
  onChange: (v: SOEdits) => void;
  products: ProductOption[];
  allowAddRemove?: boolean;
  shipQty?: Record<string, number>; // hanya untuk Delivery Order
  onShipQty?: (id: string, qty: number) => void;
}) {
  const { items, discounts, charges } = value;
  const setItems = (next: SOEditItem[]) => onChange({ ...value, items: next });
  const update = (i: number, patch: Partial<SOEditItem>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(discounts);
  const afterDiscount = subtotal * (1 - discountPercent / 100);
  const taxAmount = sumTaxAmount(subtotal, discounts);
  const total = afterDiscount + taxAmount + sumChargeAmount(charges);
  const withShip = !!shipQty;

  return (
    <>
      <Sec title="Daftar Item" icon="fi fi-rr-list">
        <div className="fv2-scroll-x">
          <div style={{ minWidth: withShip ? 900 : 760 }}>
            <div className="fv2-item-head">
              <span style={{ flex: 2 }}>Produk (SKU)</span>
              <span style={{ width: 80 }}>Qty</span>
              {withShip && <span style={{ width: 70 }}>Terkirim</span>}
              <span style={{ flex: 1 }}>Harga Satuan</span>
              <span style={{ flex: 1 }}>Subtotal</span>
              {withShip && <span style={{ width: 90 }}>Ship Qty</span>}
              <span style={{ flex: 1 }}>Catatan</span>
              <span style={{ width: 30 }} />
            </div>
            {items.map((it, i) => (
              <div key={it.id ?? `new-${i}`} className="fv2-item-row">
                <div style={{ flex: 2 }}>
                  {it.id ? (
                    <div style={{ fontSize: 12.5 }}>
                      <b>{it.sku}</b>
                      <span style={{ display: 'block', color: '#6b7280', fontSize: 11 }}>{it.name}</span>
                    </div>
                  ) : (
                    <ProductPickButton
                      products={products}
                      value={it.sku}
                      onSelect={(p) => update(i, { product_id: p.id, sku: p.sku, name: p.name, unit_price: Number(p.price) || 0 })}
                    />
                  )}
                </div>
                <input type="number" style={{ width: 80, flex: 'none' }} value={it.qty} onChange={(e) => update(i, { qty: parseFloat(e.target.value) || 0 })} />
                {withShip && <span style={{ width: 70, flex: 'none', fontSize: 12.5, color: '#6b7280' }}>{it.qty_shipped ?? 0}</span>}
                <RupiahInput style={{ flex: 1 }} value={it.unit_price} onValue={(n) => update(i, { unit_price: n })} />
                <input style={{ flex: 1 }} readOnly value={`Rp ${(it.qty * it.unit_price).toLocaleString('id-ID')}`} />
                {withShip && (
                  <input
                    type="number"
                    style={{ width: 90, flex: 'none' }}
                    min={0}
                    disabled={!it.id}
                    value={it.id ? shipQty?.[it.id] ?? 0 : 0}
                    onChange={(e) => it.id && onShipQty?.(it.id, parseFloat(e.target.value) || 0)}
                  />
                )}
                <input style={{ flex: 1 }} value={it.notes ?? ''} onChange={(e) => update(i, { notes: e.target.value })} />
                {allowAddRemove ? (
                  <button type="button" className="fv2-del-btn" aria-label="Hapus item" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                    <i className="fi fi-rr-cross-small" />
                  </button>
                ) : (
                  <span style={{ width: 30 }} />
                )}
              </div>
            ))}
          </div>
        </div>
        {allowAddRemove && (
          <button type="button" className="fv2-add-btn" onClick={() => setItems([...items, { product_id: null, sku: '', qty: 1, unit_price: 0, notes: '' }])}>
            <i className="fi fi-rr-plus" /> Tambah Item
          </button>
        )}
      </Sec>

      <Sec title="Diskon, Pajak & Biaya Tambahan" icon="fi fi-rr-receipt">
        <div className="fv2-grid">
          <div>
            <DiscountEditor lines={discounts} onChange={(d) => onChange({ ...value, discounts: d })} />
            <div style={{ height: 14 }} />
            <ChargeEditor lines={charges} onChange={(c) => onChange({ ...value, charges: c })} />
          </div>
          <div>
        <TotalsBox
          subtotal={subtotal}
          discountPercent={discountPercent}
          discountAmount={subtotal - afterDiscount}
          taxPercent={sumTaxPercent(discounts)}
          taxAmount={taxAmount}
          chargeAmount={sumChargeAmount(charges)}
          total={total}
          totalLabel="Total"
        />
          </div>
        </div>
      </Sec>
    </>
  );
}
