'use client';

import Select from '@/components/ui/Select';
import { useMemo, useState } from 'react';
import { FormModal } from './RegistryModal';
import type { ProductOption } from '@/components/ProductPicker';
import { ProductQuickModal } from './QuickAddModals';

// Pemilih produk berupa pop up kartu produk (seperti index.html), bukan dropdown.
export function ProductPickButton({
  products,
  value,
  onSelect,
  onCreated,
}: {
  products: ProductOption[];
  value: string; // SKU terpilih
  onSelect: (p: ProductOption) => void;
  onCreated?: (p: ProductOption) => void; // bila diisi, pop up menampilkan tombol "Product Baru"
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p.sku === value);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, background: '#fff', fontFamily: 'inherit', color: value ? '#1f2937' : '#9ca3af' }}
      >
        <i className="fi fi-rr-search" style={{ color: '#6b7280' }} />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? `${value}${selected ? ' — ' + selected.name : ''}` : 'Pilih produk...'}
        </span>
      </button>
      {open && (
        <ProductPickerModal
          products={products}
          selectedSku={value}
          onClose={() => setOpen(false)}
          onCreated={onCreated}
          onSelect={(p) => {
            onSelect(p);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function ProductPickerModal({
  products,
  selectedSku,
  onSelect,
  onClose,
  onCreated,
}: {
  products: ProductOption[];
  selectedSku: string;
  onSelect: (p: ProductOption) => void;
  onClose: () => void;
  onCreated?: (p: ProductOption) => void;
}) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState('');
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[], [products]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!cat || p.category === cat) &&
        (!s || [p.sku, p.name, p.brand, p.category].some((v) => (v || '').toLowerCase().includes(s)))
    );
  }, [products, q, cat]);

  return (
    <FormModal title="Pilih Produk" icon="fi fi-rr-boxes" maxWidth={980} onClose={onClose}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="fv2-field" style={{ flex: 1, minWidth: 200 }}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari SKU, nama, atau brand..." />
        </div>
        {onCreated && (
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)} style={{ whiteSpace: 'nowrap' }}>
            <i className="fi fi-rr-plus" /> Product Baru
          </button>
        )}
        {categories.length > 0 && (
          <div className="fv2-field" style={{ minWidth: 160 }}>
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 8 }}>{`${list.length} produk`}</div>
      <div className="product-grid">
        {list.length === 0 && <div className="no-data-grid">Produk tidak ditemukan</div>}
        {list.map((p) => (
          <div
            key={p.id}
            className="product-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(p)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(p)}
            style={p.sku === selectedSku ? { outline: '2px solid #2563eb' } : undefined}
          >
            <div className="product-card-image">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.sku} loading="lazy" />
              ) : (
                <i className="fa-solid fa-image no-image" />
              )}
            </div>
            <div className="product-card-body">
              <span className="product-card-sku">{p.sku}</span>
              <div className="product-card-brand">{p.name}</div>
              <div className="product-card-type">{[p.brand, p.category].filter(Boolean).join(' · ') || '-'}</div>
              <div className="product-card-price">
                <span className="uom">{p.uom || 'Pcs'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {adding && onCreated && <ProductQuickModal onClose={() => setAdding(false)} onSaved={(p) => { setAdding(false); onCreated(p); }} />}
    </FormModal>
  );
}
