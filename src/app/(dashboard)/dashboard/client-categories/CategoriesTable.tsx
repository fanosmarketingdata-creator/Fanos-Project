'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import { FormModal, DeleteModal, FvField } from '@/components/registry/RegistryModal';
import { saveCategory, deleteCategory } from './actions';

export type CategoryRow = { id: string; name: string };

export default function CategoriesTable({ initialRows }: { initialRows: CategoryRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? initialRows.filter((r) => r.name.toLowerCase().includes(q)) : initialRows;
  }, [initialRows, search]);

  function openAdd() {
    setEditId(undefined);
    setName('');
    setModalOpen(true);
  }
  function openEdit(r: CategoryRow) {
    setEditId(r.id);
    setName(r.name);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveCategory({ id: editId, name });
      if (result.error) return toast(result.error, 'error');
      toast(editId ? 'Data Client Category berhasil diperbarui' : 'Data Client Category berhasil ditambahkan', 'success');
      setModalOpen(false);
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteCategory(deleteTarget.id);
      if (result.error) return toast(result.error, 'error');
      toast('Data Client Category berhasil dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard
      title="Client Category"
      icon="fi fi-rr-apps"
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel="New Category"
      addIcon="fi fi-rr-plus"
      onAdd={openAdd}
    >
      <div className="product-grid-wrap">
        <div className="client-card-list">
          {filtered.length === 0 && <div className="no-data-grid">Belum terdapat data client category</div>}
          {filtered.map((r) => (
            <div key={r.id} className="client-card">
              <div className="client-card-avatar">{r.name.trim().charAt(0).toUpperCase() || '?'}</div>
              <div className="client-card-main">
                <div className="name">{r.name}</div>
              </div>
              <div className="client-card-actions">
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => openEdit(r)} title="Edit">
                  <i className="fi fi-rr-pencil" />
                </button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setDeleteTarget(r)} title="Hapus">
                  <i className="fi fi-rr-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <FormModal full
          title={editId ? 'Edit Category' : 'New Category'}
          icon="fi fi-rr-apps"
          maxWidth={480}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Batal
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <FvField label="Category Name" required>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Corporate" autoFocus />
            </FvField>
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <DeleteModal
          title="Konfirmasi Hapus"
          itemName={deleteTarget.name}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </RegistryCard>
  );
}
