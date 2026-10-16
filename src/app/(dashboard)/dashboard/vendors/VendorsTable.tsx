'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DeleteModal, FvField } from '@/components/registry/RegistryModal';
import { saveVendor, deleteVendor, type VendorInput } from './actions';

export type VendorRow = {
  id: string;
  company: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

const emptyForm: VendorInput = { company: '', contact_name: '', phone: '', email: '', address: '' };

export default function VendorsTable({ initialVendors }: { initialVendors: VendorRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<VendorInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialVendors;
    return initialVendors.filter((v) =>
      [v.company, v.contact_name, v.email, v.address].some((x) => (x || '').toLowerCase().includes(q))
    );
  }, [initialVendors, search]);

  const paged = usePaged(filtered, search);

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }
  function openEdit(v: VendorRow) {
    setForm({
      id: v.id,
      company: v.company,
      contact_name: v.contact_name || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveVendor(form);
      if (result.error) return toast(result.error, 'error');
      toast(form.id ? 'Vendor diperbarui' : 'Vendor ditambahkan', 'success');
      setModalOpen(false);
    } catch (e) {
      toast('Gagal menyimpan: ' + (e instanceof Error ? e.message : 'kesalahan server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteVendor(deleteTarget.id);
      if (result.error) return toast(result.error, 'error');
      toast('Vendor dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Gagal menghapus: ' + (e instanceof Error ? e.message : 'kesalahan server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard
      title="Vendor Registry"
      icon="fa-solid fa-truck"
      search={search}
      onSearch={setSearch}
      addLabel="New Vendor"
      addIcon="fa-solid fa-user-plus"
      onAdd={openAdd}
      footer={
        <Pagination
          total={paged.total}
          page={paged.page}
          totalPages={paged.totalPages}
          rowsPerPage={paged.rowsPerPage}
          onPage={paged.setPage}
          onRows={paged.setRowsPerPage}
        />
      }
    >
      <div className="product-grid-wrap">
        <div className="client-card-list">
          {paged.pageItems.length === 0 && <div className="no-data-grid">No vendors</div>}
          {paged.pageItems.map((v) => (
            <div key={v.id} className="client-card" onClick={() => openEdit(v)}>
              <div className="client-card-avatar">{v.company.trim().charAt(0).toUpperCase() || '?'}</div>
              <div className="client-card-main">
                <div className="name">{v.company}</div>
                <div className="sub">{v.address || '-'}</div>
              </div>
              <div className="client-card-meta">
                <div className="item"><div className="lbl">Contact</div><div className="val">{v.contact_name || '-'}</div></div>
                <div className="item"><div className="lbl">Phone</div><div className="val">{v.phone || '-'}</div></div>
                <div className="item"><div className="lbl">Email</div><div className="val">{v.email || '-'}</div></div>
              </div>
              <div className="client-card-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => openEdit(v)} title="Edit">
                  <i className="fi fi-rr-pencil" />
                </button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setDeleteTarget(v)} title="Hapus">
                  <i className="fi fi-rr-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <FormModal
          title={form.id ? 'Edit Vendor' : 'New Vendor'}
          icon={form.id ? 'fi fi-rr-pencil' : 'fa-solid fa-truck'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="fi fi-rr-disk" /> {saving ? 'Menyimpan...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-grid">
              <FvField label="Company Name" required>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </FvField>
              <FvField label="Contact Person">
                <input value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </FvField>
            </div>
            <div className="fv2-grid" style={{ marginTop: 14 }}>
              <FvField label="Email">
                <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </FvField>
              <FvField label="Phone">
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </FvField>
            </div>
            <div style={{ marginTop: 14 }}>
              <FvField label="Address">
                <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </FvField>
            </div>
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <DeleteModal
          title="Konfirmasi Hapus"
          itemName={deleteTarget.company}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </RegistryCard>
  );
}
