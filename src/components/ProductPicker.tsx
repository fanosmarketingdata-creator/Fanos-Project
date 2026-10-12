'use client';

import { useMemo, useRef, useState } from 'react';

export type ProductOption = { id: string; sku: string; name: string; uom: string };

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
    <div className="relative" ref={wrapRef}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(p);
                setQuery(p.sku);
                setOpen(false);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left text-xs hover:bg-slate-50"
            >
              <span className="font-mono font-semibold text-slate-700">{p.sku}</span>
              <span className="text-slate-500">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
