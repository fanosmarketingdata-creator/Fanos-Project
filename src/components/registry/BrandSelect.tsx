'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/Toast';
import { FormModal, FvField } from '@/components/registry/RegistryModal';
import FvSelect, { toOptions } from '@/components/registry/FvSelect';
import { saveBrand } from '@/app/(dashboard)/dashboard/brands/actions';

// Dropdown Brand + tombol "+" untuk menambah brand baru langsung dari form produk.
export default function BrandSelect({
  value,
  onChange,
  brands,
  onAdded,
}: {
  value: string;
  onChange: (v: string) => void;
  brands: string[];
  onAdded: (name: string) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const n = name.trim();
    if (!n) return toast('Kolom Brand Name wajib diisi.', 'error');
    setSaving(true);
    try {
      const r = await saveBrand({ name: n });
      if (r.error) return toast(r.error, 'error');
      toast('Brand berhasil ditambahkan', 'success');
      onAdded(n);
      setOpen(false);
      setName('');
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const list = brands.includes(value) || !value ? brands : [...brands, value];
  return (
    <>
      <div className="bs-row">
        <div className="bs-sel"><FvSelect value={value} onChange={onChange} options={toOptions(list)} /></div>
        <button type="button" className="bs-add" onClick={() => setOpen(true)} title="Tambah Brand baru" aria-label="Tambah Brand baru">
          <i className="fi fi-rr-plus" />
        </button>
      </div>
      {open && typeof document !== 'undefined' && createPortal(
        <FormModal
          title="New Brand"
          icon="fa-solid fa-award"
          maxWidth={460}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Batal</button>
            </>
          }
        >
          <FvField label="Brand Name" required>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} placeholder="Nama brand" />
          </FvField>
        </FormModal>,
        document.body,
      )}
    </>
  );
}
