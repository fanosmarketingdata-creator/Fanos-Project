'use client';

import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';

export function DiscountEditor({ lines, onChange }: { lines: DiscountLine[]; onChange: (lines: DiscountLine[]) => void }) {
  return (
    <div>
      <div className="fv2-section-title"><i className="fi fi-rr-tags" /> Diskon</div>
      {lines.map((d, i) => (
        <div key={i} className="fv2-item-row">
          <input
            value={d.label}
            onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
            placeholder="Keterangan (contoh: Diskon Proyek)"
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={d.percent}
            onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, percent: parseFloat(e.target.value) || 0 } : l)))}
            placeholder="%"
            style={{ width: 80, flex: 'none' }}
          />
          <button type="button" className="fv2-del-btn" aria-label="Hapus" onClick={() => onChange(lines.filter((_, j) => j !== i))}>
            <i className="fi fi-rr-cross-small" />
          </button>
        </div>
      ))}
      <button type="button" className="fv2-add-btn amber" onClick={() => onChange([...lines, { label: '', percent: 0 }])}>
        <i className="fi fi-rr-plus" /> Tambah Diskon
      </button>
    </div>
  );
}

export function ChargeEditor({ lines, onChange }: { lines: ChargeLine[]; onChange: (lines: ChargeLine[]) => void }) {
  return (
    <div>
      <div className="fv2-section-title"><i className="fi fi-rr-receipt" /> Biaya Tambahan</div>
      {lines.map((c, i) => (
        <div key={i} className="fv2-item-row">
          <input
            value={c.label}
            onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
            placeholder="Keterangan (contoh: Biaya Kirim)"
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={c.amount}
            onChange={(e) => onChange(lines.map((l, j) => (j === i ? { ...l, amount: parseFloat(e.target.value) || 0 } : l)))}
            placeholder="Rp"
            style={{ width: 120, flex: 'none' }}
          />
          <button type="button" className="fv2-del-btn" aria-label="Hapus" onClick={() => onChange(lines.filter((_, j) => j !== i))}>
            <i className="fi fi-rr-cross-small" />
          </button>
        </div>
      ))}
      <button type="button" className="fv2-add-btn green" onClick={() => onChange([...lines, { label: '', amount: 0 }])}>
        <i className="fi fi-rr-plus" /> Tambah Biaya
      </button>
    </div>
  );
}
