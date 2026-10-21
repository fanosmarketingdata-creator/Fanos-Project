'use client';

import Select from '@/components/ui/Select';
import { useEffect, useState } from 'react';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import FinanceOptionModal from '@/components/registry/FinanceOptionModal';
import { listFinanceOptions } from '@/app/(dashboard)/dashboard/finance/actions';
import type { FinanceKind, FinanceOption } from '@/lib/finance';

const NEW_DISCOUNT = '__new_discount__';
const NEW_TAX = '__new_tax__';

export function DiscountEditor({ lines, onChange }: { lines: DiscountLine[]; onChange: (lines: DiscountLine[]) => void }) {
  const [presets, setPresets] = useState<FinanceOption[]>([]);
  const [adding, setAdding] = useState<{ idx: number; kind: FinanceKind } | null>(null);

  useEffect(() => {
    let alive = true;
    listFinanceOptions(['discount', 'tax']).then((o) => alive && setPresets(o)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const pick = (i: number, id: string) => {
    if (id === NEW_DISCOUNT || id === NEW_TAX) return setAdding({ idx: i, kind: id === NEW_TAX ? 'tax' : 'discount' });
    const o = presets.find((p) => p.id === id);
    if (o) onChange(lines.map((l, j) => (j === i ? { label: o.name, percent: o.value ?? 0, kind: o.kind === 'tax' ? 'tax' : 'discount' } : l)));
  };
  const selectedId = (d: DiscountLine) =>
    presets.find((p) => p.name === d.label && (p.value ?? 0) === d.percent && (p.kind === 'tax') === (d.kind === 'tax'))?.id ?? '';
  const group = (kind: FinanceKind) => presets.filter((p) => p.kind === kind);

  return (
    <div>
      <div className="fv2-section-title"><i className="fi fi-rr-tags" /> Diskon (−) &amp; Pajak (+)</div>
      {lines.map((d, i) => (
        <div key={i} className="fv2-item-row">
          <span style={{ flex: 'none', width: 22, textAlign: 'center', fontWeight: 800, color: d.kind === 'tax' ? '#16a34a' : '#dc2626' }}>{d.kind === 'tax' ? '+' : '−'}</span>
          <Select value={selectedId(d)} onChange={(e) => pick(i, e.target.value)} style={{ flex: 1 }}>
            <option value="">{d.label ? `${d.label} (manual)` : d.kind === 'tax' ? '— Pilih pajak —' : '— Pilih diskon —'}</option>
            {group(d.kind === 'tax' ? 'tax' : 'discount').map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.value ?? 0}%)</option>
            ))}
            {d.kind === 'tax' ? <option value={NEW_TAX}>+ Pajak baru…</option> : <option value={NEW_DISCOUNT}>+ Diskon baru…</option>}
          </Select>
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
      </button>{' '}
      <button type="button" className="fv2-add-btn green" onClick={() => onChange([...lines, { label: '', percent: 0, kind: 'tax' }])}>
        <i className="fi fi-rr-plus" /> Tambah Pajak
      </button>
      {adding && (
        <FinanceOptionModal
          kind={adding.kind}
          onClose={() => setAdding(null)}
          onSaved={(o) => {
            setPresets((p) => [...p.filter((x) => x.id !== o.id), o]);
            onChange(lines.map((l, j) => (j === adding.idx ? { label: o.name, percent: o.value ?? 0, kind: o.kind === 'tax' ? 'tax' : 'discount' } : l)));
            setAdding(null);
          }}
        />
      )}
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
