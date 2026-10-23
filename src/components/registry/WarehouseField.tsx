'use client';

import { useEffect, useState } from 'react';
import FvSelect from '@/components/registry/FvSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { getWarehouseOptions } from '@/lib/stock-actions';

// Dropdown Gudang yang memuat opsinya sendiri dan otomatis memilih gudang default.
export default function WarehouseField({ value, onChange, label = 'Gudang', required }: { value: string; onChange: (v: string) => void; label?: string; required?: boolean }) {
  const [opts, setOpts] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    let live = true;
    getWarehouseOptions().then((r) => {
      if (!live) return;
      setOpts(r.options);
      if (!value && r.defaultId) onChange(r.defaultId);
    }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <FvField label={label} required={required}>
      <FvSelect value={value} onChange={onChange} options={opts} placeholder="Pilih gudang" />
    </FvField>
  );
}
