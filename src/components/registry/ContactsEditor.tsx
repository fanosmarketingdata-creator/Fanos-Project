'use client';

import { FvField } from '@/components/registry/RegistryModal';
import { emptyContact, type ContactInfo } from '@/lib/client-contacts';

// Daftar kontak client: bisa tambah / hapus lebih dari satu kontak.
export default function ContactsEditor({ value, onChange }: { value: ContactInfo[]; onChange: (v: ContactInfo[]) => void }) {
  const list = value.length ? value : [emptyContact()];
  const set = (i: number, patch: Partial<ContactInfo>) => onChange(list.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  return (
    <div className="fv2-section">
      <div className="fv2-section-title"><i className="fi fi-rr-user" /> Kontak</div>
      {list.map((c, i) => (
        <div key={i} className="ce-item">
          {list.length > 1 && (
            <div className="ce-head">
              <span>Kontak {i + 1}{i === 0 ? ' (utama)' : ''}</span>
              <button type="button" className="ce-del" onClick={() => onChange(list.filter((_, k) => k !== i))} title="Hapus kontak">
                <i className="fi fi-rr-trash" /> Hapus
              </button>
            </div>
          )}
          <div className="fv2-grid">
            <FvField label="Contact Person">
              <input value={c.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Nama penanggung jawab (PIC)" />
            </FvField>
            <FvField label="Position">
              <input value={c.position} onChange={(e) => set(i, { position: e.target.value })} placeholder="Jabatan penanggung jawab" />
            </FvField>
            <FvField label="Phone">
              <input value={c.phone} onChange={(e) => set(i, { phone: e.target.value })} placeholder="08xx-xxxx-xxxx" />
            </FvField>
            <FvField label="Email">
              <input type="email" value={c.email} onChange={(e) => set(i, { email: e.target.value })} placeholder="nama@perusahaan.com" />
            </FvField>
          </div>
        </div>
      ))}
      <button type="button" className="ce-add" onClick={() => onChange([...list, emptyContact()])}>
        <i className="fi fi-rr-plus" /> Tambah Kontak
      </button>
    </div>
  );
}
