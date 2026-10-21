'use client';

import { useEffect, useState } from 'react';
import FvSelect from '@/components/registry/FvSelect';
import FinanceOptionModal from '@/components/registry/FinanceOptionModal';
import { listFinanceOptions } from '@/app/(dashboard)/dashboard/finance/actions';
import type { FinanceKind, FinanceOption } from '@/lib/finance';

const NEW = '__new__';

// Dropdown yang daftarnya diambil dari master Finance dan bisa menambah data baru langsung dari dropdown.
// useAmount: nilai yang disimpan = nominal (Credit Limit); selain itu nilai = nama.
export default function FinanceSelect({
  kind, value, onChange, useAmount, placeholder,
}: {
  kind: FinanceKind;
  value: string;
  onChange: (v: string) => void;
  useAmount?: boolean;
  placeholder?: string;
}) {
  const [opts, setOpts] = useState<FinanceOption[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    listFinanceOptions([kind]).then((o) => alive && setOpts(o)).catch(() => {});
    return () => { alive = false; };
  }, [kind]);

  const val = (o: FinanceOption) => (useAmount ? String(o.value ?? 0) : o.name);
  const options = [
    ...opts.map((o) => ({ value: val(o), label: o.name })),
    { value: NEW, label: '+ Tambah baru…' },
  ];

  return (
    <>
      <FvSelect
        value={value}
        onChange={(v) => (v === NEW ? setAdding(true) : onChange(v))}
        options={options}
        placeholder={placeholder}
      />
      {adding && (
        <FinanceOptionModal
          kind={kind}
          onClose={() => setAdding(false)}
          onSaved={(o) => {
            setOpts((p) => [...p.filter((x) => x.id !== o.id), o].sort((a, b) => a.name.localeCompare(b.name)));
            onChange(val(o));
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
