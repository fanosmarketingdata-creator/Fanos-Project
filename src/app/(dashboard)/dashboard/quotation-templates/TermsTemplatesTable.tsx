'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import { FormModal, DeleteModal, FvField } from '@/components/registry/RegistryModal';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/RichTextEditor';
import { RT_MARK } from '@/lib/rich-text';
import { saveTermsTemplate, deleteTermsTemplate, type TermsTemplate } from './actions';


export default function TermsTemplatesTable({ initialRows }: { initialRows: TermsTemplate[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const [content, setContent] = useState(RT_MARK);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<TermsTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? initialRows.filter((r) => r.name.toLowerCase().includes(q)) : initialRows;
  }, [initialRows, search]);

  function openAdd() {
    setEditId(undefined); setName(''); setLang('id'); setContent(RT_MARK); setIsDefault(false); setOpen(true);
  }
  function openEdit(r: TermsTemplate) {
    setEditId(r.id); setName(r.name); setLang(r.lang); setContent(r.content); setIsDefault(r.is_default); setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveTermsTemplate({ id: editId, name, lang, content, is_default: isDefault });
      if (res.error) return toast(res.error, 'error');
      toast(editId ? 'Template berhasil diperbarui' : 'Template berhasil ditambahkan', 'success');
      setOpen(false);
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete() {
    if (!del) return;
    setDeleting(true);
    try {
      const res = await deleteTermsTemplate(del.id);
      if (res.error) return toast(res.error, 'error');
      toast('Template berhasil dihapus', 'success');
      setDel(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard
      title="Terms Template"
      icon="fi fi-rr-document-signed"
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel="New Template"
      addIcon="fi fi-rr-plus"
      onAdd={openAdd}
    >
      <div className="product-grid-wrap">
        <div className="client-card-list">
          {filtered.length === 0 && <div className="no-data-grid">Belum terdapat template syarat &amp; ketentuan</div>}
          {filtered.map((r) => (
            <div key={r.id} className="client-card">
              <div className="client-card-avatar">{r.name.trim().charAt(0).toUpperCase() || '?'}</div>
              <div className="client-card-main">
                <div className="name">
                  {r.name}
                  {r.is_default && <span className="badge badge-active" style={{ marginLeft: 8 }}>Default</span>}
                </div>
              </div>
              <div className="client-card-meta" style={{ gridTemplateColumns: '1fr', flex: '0 0 90px' }}>
                <div className="item"><div className="lbl">Bahasa</div><div className="val">{r.lang === 'en' ? 'English' : 'Indonesia'}</div></div>
              </div>
              <div className="client-card-actions">
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => openEdit(r)} title="Edit"><i className="fi fi-rr-pencil" /></button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setDel(r)} title="Hapus"><i className="fi fi-rr-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <FormModal full
          title={editId ? 'Edit Terms Template' : 'New Terms Template'}
          icon="fi fi-rr-document-signed"
          maxWidth={760}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Batal</button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-grid">
              <FvField label="Nama Template" required>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Standar 7 hari, DP 50%" autoFocus />
              </FvField>
              <FvField label="Bahasa">
                <Select value={lang} onChange={(e) => setLang(e.target.value as 'id' | 'en')}>
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </Select>
              </FvField>
            </div>
            <FvField label="Syarat & Ketentuan" required>
              <RichTextEditor value={content} onChange={setContent} minHeight={260} />
            </FvField>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              Jadikan template default (terpilih otomatis saat cetak Quotation)
            </label>
          </div>
        </FormModal>
      )}

      {del && <DeleteModal title="Konfirmasi Hapus" itemName={del.name} busy={deleting} onConfirm={handleDelete} onClose={() => setDel(null)} />}
    </RegistryCard>
  );
}
