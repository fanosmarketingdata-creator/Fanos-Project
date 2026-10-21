'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DetailModal, DeleteModal, DvCard, FvField } from '@/components/registry/RegistryModal';
import FinanceSelect from '@/components/registry/FinanceSelect';
import { CREDIT_LIMIT_OPTIONS } from '@/lib/master-options';
import { saveClient, deleteClient, type ClientInput } from './actions';

export type ClientRow = {
  id: string;
  client_no: string | null;
  company: string;
  contact_name: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  credit_limit: number | null;
};

const emptyForm: ClientInput = { company: '', contact_name: '', position: '', phone: '', email: '', address: '', credit_limit: null };

const creditLabel = (n: number | null) =>
  n == null ? '-' : CREDIT_LIMIT_OPTIONS.find((o) => o.value === Number(n))?.label ?? 'Rp ' + Number(n).toLocaleString('id-ID');

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
      [c.client_no, c.company, c.contact_name, c.position, c.email, c.address].some((v) => (v || '').toLowerCase().includes(q))
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
      company: c.company,
      contact_name: c.contact_name || '',
      position: c.position || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      credit_limit: c.credit_limit == null ? null : Number(c.credit_limit),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveClient(form);
      if (result.error) return toast(result.error, 'error');
      toast(form.id ? 'Data Client berhasil diperbarui' : 'Data Client berhasil ditambahkan', 'success');
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
      const result = await deleteClient(deleteTarget.id);
      if (result.error) return toast(result.error, 'error');
      toast('Data Client berhasil dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
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
          {paged.pageItems.length === 0 && <div className="no-data-grid">Belum terdapat data client</div>}
          {paged.pageItems.map((c) => (
            <div key={c.id} className="client-card" onClick={() => setDetail(c)}>
              <div className="client-card-avatar">{c.company.trim().charAt(0).toUpperCase() || '?'}</div>
              <div className="client-card-main">
                <div className="name">{c.company}</div>
                <div className="sub">{c.client_no || '-'}</div>
              </div>
              <div className="client-card-meta">
                <div className="item"><div className="lbl">Contact</div><div className="val">{c.contact_name || '-'}{c.position ? ` · ${c.position}` : ''}</div></div>
                <div className="item"><div className="lbl">Phone</div><div className="val">{c.phone || '-'}</div></div>
                <div className="item"><div className="lbl">Email</div><div className="val">{c.email || '-'}</div></div>
                <div className="item"><div className="lbl">Credit Limit</div><div className="val">{creditLabel(c.credit_limit)}</div></div>
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
                <div className="dv2-topbar-id">{detail.client_no || 'Client'}</div>
                <div className="dv2-topbar-title">{detail.company}</div>
              </div>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-user" label="Contact Person" value={detail.contact_name || '-'} />
              <DvCard icon="fi fi-rr-briefcase" label="Position" value={detail.position || '-'} />
              <DvCard icon="fi fi-rr-envelope" label="Email" value={detail.email || '-'} />
              <DvCard icon="fi fi-rr-phone-call" label="Phone" value={detail.phone || '-'} />
              <DvCard icon="fi fi-rr-credit-card" label="Credit Limit" value={creditLabel(detail.credit_limit)} color="#16a34a" />
            </div>
            <div className="dv2-section-title"><i className="fi fi-rr-marker" /> Company Address</div>
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
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Batal
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-building" /> Informasi Perusahaan</div>
            <div className="fv2-grid">
              <FvField label="Client No">
                <input value={form.id ? initialClients.find((c) => c.id === form.id)?.client_no || '' : ''} placeholder="Dibuat otomatis oleh sistem" readOnly />
              </FvField>
              <FvField label="Company Name" required>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="PT Contoh Sejahtera" />
              </FvField>
            </div>
            <div style={{ marginTop: 14 }}>
              <FvField label="Company Address">
                <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap perusahaan" />
              </FvField>
            </div>
            <div style={{ marginTop: 14 }}>
              <FvField label="Credit Limit">
                <FinanceSelect kind="credit_limit" useAmount value={form.credit_limit == null ? '' : String(form.credit_limit)} onChange={(v) => setForm({ ...form, credit_limit: v === '' ? null : Number(v) })} />
              </FvField>
            </div>
          </div>
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-user" /> Kontak</div>
            <div className="fv2-grid">
              <FvField label="Contact Person">
                <input value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Nama penanggung jawab (PIC)" />
              </FvField>
              <FvField label="Position">
                <input value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Jabatan penanggung jawab" />
              </FvField>
              <FvField label="Phone">
                <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xx-xxxx-xxxx" />
              </FvField>
              <FvField label="Email">
                <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@perusahaan.com" />
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
