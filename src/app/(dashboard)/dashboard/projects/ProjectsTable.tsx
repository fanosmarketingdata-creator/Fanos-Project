'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DetailModal, DeleteModal, DvCard, FvField } from '@/components/registry/RegistryModal';
import FvSelect, { toOptions } from '@/components/registry/FvSelect';
import { PROJECT_TRIGGER_OPTIONS, PROJECT_TYPE_OPTIONS, TOP_OPTIONS } from '@/lib/master-options';
import { saveProject, deleteProject, type ProjectInput } from './actions';

export type ProjectRow = {
  id: string;
  project_no: string | null;
  name: string;
  location: string | null;
  classification: string | null;
  project_type: string | null;
  client_id: string | null;
  client_company: string | null;
  client_name: string | null;
  trigger_source: string | null;
  triggered_by: string | null;
  top: string | null;
  cashback: string | null;
};
type ClientOpt = { id: string; company: string; contact_name: string | null };

const emptyForm: ProjectInput = {
  name: '', location: '', classification: '', project_type: '', client_id: '',
  trigger_source: '', triggered_by: '', top: '', cashback: '',
};

export default function ProjectsTable({ initialProjects, clients, classifications }: { initialProjects: ProjectRow[]; clients: ClientOpt[]; classifications: string[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProjectInput>(emptyForm);
  const [projectNo, setProjectNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<ProjectRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialProjects;
    return initialProjects.filter((p) =>
      [p.project_no, p.name, p.location, p.classification, p.project_type, p.client_company, p.client_name, p.triggered_by].some((v) =>
        (v || '').toLowerCase().includes(q)
      )
    );
  }, [initialProjects, search]);

  const paged = usePaged(filtered, search);
  const selectedClient = clients.find((c) => c.id === form.client_id);

  function openAdd() {
    setForm(emptyForm);
    setProjectNo('');
    setModalOpen(true);
  }
  function openEdit(p: ProjectRow) {
    setForm({
      id: p.id,
      name: p.name,
      location: p.location || '',
      classification: p.classification || '',
      project_type: p.project_type || '',
      client_id: p.client_id || '',
      trigger_source: p.trigger_source || '',
      triggered_by: p.triggered_by || '',
      top: p.top || '',
      cashback: p.cashback || '',
    });
    setProjectNo(p.project_no || '');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveProject(form);
      if (result.error) return toast(result.error, 'error');
      toast(form.id ? 'Data Project berhasil diperbarui' : 'Data Project berhasil ditambahkan', 'success');
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
      const result = await deleteProject(deleteTarget.id);
      if (result.error) return toast(result.error, 'error');
      toast('Data Project berhasil dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard
      title="Project Master"
      icon="fa-solid fa-diagram-project"
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel="New Project"
      addIcon="fa-solid fa-folder-plus"
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
          {paged.pageItems.length === 0 && <div className="no-data-grid">Belum terdapat data project</div>}
          {paged.pageItems.map((p) => (
            <div key={p.id} className="client-card" onClick={() => setDetail(p)}>
              <div className="client-card-avatar">{p.name.trim().charAt(0).toUpperCase() || '?'}</div>
              <div className="client-card-main">
                <div className="name">{p.name}</div>
                <div className="sub">{[p.project_no, p.location].filter(Boolean).join(' · ') || '-'}</div>
              </div>
              <div className="client-card-meta">
                <div className="item"><div className="lbl">Client</div><div className="val">{p.client_company || '-'}</div></div>
                <div className="item"><div className="lbl">Type</div><div className="val">{p.project_type || '-'}</div></div>
                <div className="item"><div className="lbl">Trigger</div><div className="val">{p.trigger_source || '-'}</div></div>
                <div className="item"><div className="lbl">TOP</div><div className="val">{p.top || '-'}</div></div>
              </div>
              <div className="client-card-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => openEdit(p)} title="Edit">
                  <i className="fi fi-rr-pencil" />
                </button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setDeleteTarget(p)} title="Hapus">
                  <i className="fi fi-rr-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <DetailModal title="Project Detail" onClose={() => setDetail(null)}>
          <div className="dv2">
            <div className="dv2-topbar">
              <div>
                <div className="dv2-topbar-id">{detail.project_no || 'Project'}</div>
                <div className="dv2-topbar-title">{detail.name}</div>
              </div>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-marker" label="Project Location" value={detail.location || '-'} />
              <DvCard icon="fi fi-rr-tags" label="Classification" value={detail.classification || '-'} />
              <DvCard icon="fi fi-rr-apps" label="Project Type" value={detail.project_type || '-'} />
              <DvCard icon="fi fi-rr-building" label="Client Company" value={detail.client_company || '-'} />
              <DvCard icon="fi fi-rr-user" label="Client Name" value={detail.client_name || '-'} />
              <DvCard icon="fi fi-rr-bullseye-arrow" label="Trigger" value={detail.trigger_source || '-'} />
              <DvCard icon="fi fi-rr-user-add" label="Triggered By" value={detail.triggered_by || '-'} />
              <DvCard icon="fi fi-rr-calendar" label="Term of Payment" value={detail.top || '-'} />
              <DvCard icon="fi fi-rr-money-bill" label="Cashback" value={detail.cashback || '-'} color="#16a34a" />
            </div>
          </div>
        </DetailModal>
      )}

      {modalOpen && (
        <FormModal
          title={form.id ? 'Edit Project' : 'New Project'}
          icon={form.id ? 'fa-solid fa-pencil' : 'fa-solid fa-folder-plus'}
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
            <div className="fv2-section-title"><i className="fi fi-rr-briefcase" /> Informasi Project</div>
            <div className="fv2-grid">
              <FvField label="Project No">
                <input value={projectNo} placeholder="Dibuat otomatis oleh sistem" readOnly />
              </FvField>
              <FvField label="Project Name" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masukkan nama proyek" />
              </FvField>
              <FvField label="Project Location">
                <input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lokasi proyek (kota/wilayah)" />
              </FvField>
              <FvField label="Project Classification">
                <FvSelect value={form.classification || ''} onChange={(v) => setForm({ ...form, classification: v })} options={toOptions(classifications)} />
              </FvField>
              <FvField label="Project Type">
                <FvSelect value={form.project_type || ''} onChange={(v) => setForm({ ...form, project_type: v })} options={toOptions(PROJECT_TYPE_OPTIONS)} />
              </FvField>
            </div>
          </div>

          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-building" /> Client</div>
            <div className="fv2-grid">
              <FvField label="Client Company">
                <FvSelect
                  value={form.client_id || ''}
                  onChange={(v) => setForm({ ...form, client_id: v })}
                  options={clients.map((c) => ({ value: c.id, label: c.company }))}
                  placeholder="— Pilih client —"
                />
              </FvField>
              <FvField label="Client Name">
                <input value={selectedClient?.contact_name || ''} placeholder="Terisi otomatis sesuai Client Company" readOnly />
              </FvField>
            </div>
          </div>

          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-bullseye-arrow" /> Trigger & Pembayaran</div>
            <div className="fv2-grid">
              <FvField label="Trigger">
                <FvSelect value={form.trigger_source || ''} onChange={(v) => setForm({ ...form, trigger_source: v })} options={toOptions(PROJECT_TRIGGER_OPTIONS)} />
              </FvField>
              <FvField label="Triggered By">
                <input value={form.triggered_by || ''} onChange={(e) => setForm({ ...form, triggered_by: e.target.value })} placeholder="Nama pihak pemicu proyek" />
              </FvField>
              <FvField label="Term of Payment">
                <FvSelect value={form.top || ''} onChange={(v) => setForm({ ...form, top: v })} options={toOptions(TOP_OPTIONS)} />
              </FvField>
              <FvField label="Cashback">
                <input value={form.cashback || ''} onChange={(e) => setForm({ ...form, cashback: e.target.value })} placeholder="Contoh: 5% atau Rp 2.000.000" />
              </FvField>
            </div>
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <DeleteModal
          title="Konfirmasi Hapus"
          itemName={`${deleteTarget.project_no ?? ''} — ${deleteTarget.name}`}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </RegistryCard>
  );
}
