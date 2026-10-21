'use client';

import Select from '@/components/ui/Select';

export type SearchOption = { value: string; label: string; sub?: string };

// Dropdown dengan pencarian. Memakai komponen Select yang sama dengan semua dropdown lain
// supaya tampilannya seragam.
export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Cari...',
  disabled,
}: {
  value: string;
  onChange: (value: string, option: SearchOption) => void;
  options: SearchOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      searchable
      searchPlaceholder={placeholder}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        const o = options.find((x) => x.value === e.target.value);
        onChange(e.target.value, o ?? { value: e.target.value, label: '' });
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} data-sub={o.sub}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
