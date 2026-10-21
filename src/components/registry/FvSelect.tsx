'use client';

import Select from '@/components/ui/Select';

// Dropdown untuk field PRE-DETERMINED / LOOKUP. Bila nilai yang tersimpan
// (data lama) tidak ada di daftar, nilai itu tetap ditampilkan supaya tidak hilang.
export default function FvSelect({
  value,
  onChange,
  options,
  placeholder = '— Pilih salah satu —',
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const known = options.some((o) => o.value === value);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {value && !known && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export const toOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));
