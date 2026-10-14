'use client';

import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';

export function DiscountEditor({
  lines,
  onChange,
}: {
  lines: DiscountLine[];
  onChange: (lines: DiscountLine[]) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">Diskon</label>
      <div className="space-y-2">
        {lines.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={d.label}
              onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
              placeholder="Label (mis. Diskon Proyek)"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
            />
            <div className="relative w-24">
              <input
                type="number"
                value={d.percent}
                onChange={(e) =>
                  onChange(lines.map((l, j) => (j === i ? { ...l, percent: parseFloat(e.target.value) || 0 } : l)))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 pr-6 text-sm outline-none focus:border-brand-500"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
            <button
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...lines, { label: '', percent: 0 }])}
        className="mt-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        + Tambah Diskon
      </button>
    </div>
  );
}

export function ChargeEditor({
  lines,
  onChange,
}: {
  lines: ChargeLine[];
  onChange: (lines: ChargeLine[]) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">Biaya Tambahan</label>
      <div className="space-y-2">
        {lines.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={c.label}
              onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
              placeholder="Label (mis. Biaya Kirim)"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              value={c.amount}
              onChange={(e) =>
                onChange(lines.map((l, j) => (j === i ? { ...l, amount: parseFloat(e.target.value) || 0 } : l)))
              }
              placeholder="Rp"
              className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
              className="shrink-0 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...lines, { label: '', amount: 0 }])}
        className="mt-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        + Tambah Biaya
      </button>
    </div>
  );
}
