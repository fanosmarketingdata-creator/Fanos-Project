'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DetailModal, DeleteModal, DvCard, FvField } from '@/components/registry/RegistryModal';
import { saveClient, deleteClient, type ClientInput } from './actions';

export type ClientRow = {
  id: string;
  project_name: string;
  company: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
};

const emptyForm: ClientInput = { project_name: '', company: '', contact_name: '', phone: '', email: '', address: '', city: '' };

const displayName = (c: ClientRow) => c.company || c.project_name;

export default function ClientsTable({ initialClients }: { initialClients: ClientRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<ClientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialClients;
    return initialClients.filter((c) =>
      [c.project_name, c.company, c.contact_name, c.email, c.address, c.city].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [initialClients, search]);

  const paged = usePaged(filtered, search);

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }
  function openEdit(c: ClientRow) {
    setForm({
      id: c.id,
      project_name: c.project_name,
      company: c.company || '',
      contact_name: c.contact_name || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      city: c.city || '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveClient(form);
      if (result.error) return toast(result.error, 'error');
      toast(form.id ? 'Client diperbarui' : 'Client ditambahkan', 'success');
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
      const result = await deleteClient(deleteTarget.id);
      if (result.error) return toast(result.error, 'error');
      toast('Client dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Gagal menghapus: ' + (e instanceof Error ? e.message : 'kesalahan server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard
      title="Client Registry"
      icon="fa-solid fa-users"
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel="New Client"
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
          {paged.pageItems.length === 0 && <div className="no-data-grid">No clients</div>}
          {paged.pageItems.map((c) => (
            <div key={c.id} className="client-card" onClick={() => setDetail(c)}>
              <div className="client-card-avatar">{displayName(c).trim().charAt(0).toUpperCase() || '?'}</div>
              <div className="client-card-main">
                <div className="name">{displayName(c)}</div>
                <div className="sub">{c.company ? c.project_name : c.city || '-'}</div>
              </div>
              <div className="client-card-meta">
                <div className="item"><div className="lbl">Contact</div><div className="val">{c.contact_name || '-'}</div></div>
                <div className="item"><div className="lbl">Phone</div><div className="val">{c.phone || '-'}</div></div>
                <div className="item"><div className="lbl">Email</div><div className="val">{c.email || '-'}</div></div>
                <div className="item"><div className="lbl">City</div><div className="val">{c.city || '-'}</div></div>
              </div>
              <div className="client-card-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => openEdit(c)} title="Edit">
                  <i className="fi fi-rr-pencil" />
                </button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setDeleteTarget(c)} title="Hapus">
                  <i className="fi fi-rr-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <DetailModal title="Client Detail" onClose={() => setDetail(null)}>
          <div className="dv2">
            <div className="dv2-topbar">
              <div>
                <div className="dv2-topbar-id">Client</div>
                <div className="dv2-topbar-title">{displayName(detail)}</div>
              </div>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-briefcase" label="Project Name" value={detail.project_name || '-'} />
              <DvCard icon="fi fi-rr-user" label="Contact Person" value={detail.contact_name || '-'} />
              <DvCard icon="fi fi-rr-envelope" label="Email" value={detail.email || '-'} />
              <DvCard icon="fi fi-rr-phone-call" label="Phone" value={detail.phone || '-'} />
              <DvCard icon="fi fi-rr-building" label="City" value={detail.city || '-'} />
            </div>
            <div className="dv2-section-title"><i className="fi fi-rr-marker" /> Alamat</div>
            <div className="dv2-card">
              <div className="dv2-card-icon"><i className="fi fi-rr-home" /></div>
              <div><div className="dv2-card-value" style={{ fontWeight: 500 }}>{detail.address || '-'}</div></div>
            </div>
          </div>
        </DetailModal>
      )}

      {modalOpen && (
        <FormModal
          title={form.id ? 'Edit Client' : 'New Client'}
          icon={form.id ? 'fa-solid fa-pencil' : 'fa-solid fa-user-plus'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-building" /> Informasi Perusahaan</div>
            <div className="fv2-grid">
              <FvField label="Company Name">
                <input value={form.company || ''} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="PT Contoh Sejahtera" />
              </FvField>
              <FvField label="Project Name" required>
                <input value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} placeholder="Nama proyek" />
              </FvField>
            </div>
            <div style={{ marginTop: 14 }}>
              <FvField label="Address">
                <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap" />
              </FvField>
            </div>
            <div style={{ marginTop: 14 }}>
              <FvField label="City">
                <input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Kota" />
              </FvField>
            </div>
          </div>
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-user" /> Kontak</div>
            <div className="fv2-grid">
              <FvField label="Contact Person">
                <input value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Nama PIC" />
              </FvField>
              <FvField label="Phone">
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xx-xxxx-xxxx" />
              </FvField>
              <FvField label="Email">
                <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@email.com" />
              </FvField>
            </div>
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <DeleteModal
          title="Konfirmasi Hapus"
          itemName={displayName(deleteTarget)}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </RegistryCard>
  );
}
