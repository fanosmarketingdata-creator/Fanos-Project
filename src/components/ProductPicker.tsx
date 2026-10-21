'use client';

import { useMemo, useRef, useState } from 'react';

export type ProductOption = { id: string; sku: string; name: string; uom: string; image_url?: string | null; brand?: string | null; category?: string | null; price?: number | null; cost_price?: number | null };

export default function ProductPicker({
  products,
  value,
  onSelect,
  placeholder = 'Cari SKU / nama produk...',
}: {
  products: ProductOption[];
  value: string; // sku saat ini (ditampilkan di input)
  onSelect: (product: ProductOption) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 20);
    return products
      .filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, query]);

  return (
    <div className="fv2-select-search" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <i className="fi fi-rr-angle-down arrow" />
      {open && results.length > 0 && (
        <div className="fv2-select-dropdown">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              className="opt"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(p);
                setQuery(p.sku);
                setOpen(false);
              }}
            >
              {p.sku}
              <span className="sub">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
