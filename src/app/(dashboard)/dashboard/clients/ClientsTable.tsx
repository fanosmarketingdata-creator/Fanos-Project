'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DetailModal, DeleteModal, DvCard, FvField } from '@/components/registry/RegistryModal';
import FvSelect from '@/components/registry/FvSelect';
import FinanceSelect from '@/components/registry/FinanceSelect';
import { CREDIT_LIMIT_OPTIONS } from '@/lib/master-options';
import { saveClient, deleteClient, getClientProjects, type ClientInput, type ClientProjectInfo } from './actions';

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
  status: string | null;
};

const STATUSES = ['Active', 'Inactive', 'Blacklist', 'Unverified'] as const;
const STATUS_META: Record<string, { icon: string; color: string; bg: string }> = {
  Active: { icon: 'fi fi-rr-badge-check', color: '#16a34a', bg: '#dcfce7' },
  Inactive: { icon: 'fi fi-rr-pause-circle', color: '#64748b', bg: '#f1f5f9' },
  Blacklist: { icon: 'fi fi-rr-ban', color: '#dc2626', bg: '#fee2e2' },
  Unverified: { icon: 'fi fi-rr-time-quarter-to', color: '#d97706', bg: '#fef3c7' },
};

function StatusBadge({ status, withLabel }: { status: string | null; withLabel?: boolean }) {
  const st = status && STATUS_META[status] ? status : 'Unverified';
  const m = STATUS_META[st];
  return (
    <span
      title={st}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: m.bg, color: m.color, borderRadius: 999, padding: withLabel ? '2px 9px 2px 6px' : 0, width: withLabel ? undefined : 20, height: 20, justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}
    >
      <i className={m.icon} style={{ fontSize: 12, lineHeight: 1 }} />
      {withLabel && st}
    </span>
  );
}

const emptyForm: ClientInput = { company: '', contact_name: '', position: '', phone: '', email: '', address: '', credit_limit: null, status: 'Unverified' };

const creditLabel = (n: number | null) =>
  n == null ? '-' : CREDIT_LIMIT_OPTIONS.find((o) => o.value === Number(n))?.label ?? 'Rp ' + Number(n).toLocaleString('id-ID');

export default function ClientsTable({ initialClients }: { initialClients: ClientRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<ClientRow | null>(null);
  const [cProjects, setCProjects] = useState<ClientProjectInfo[] | null>(null);
  useEffect(() => {
    setCProjects(null);
    if (!detail) return;
    let alive = true;
    getClientProjects(detail.id).then((r) => { if (alive) setCProjects(r); }).catch(() => { if (alive) setCProjects([]); });
    return () => { alive = false; };
  }, [detail]);
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
      status: c.status || 'Unverified',
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
                <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><StatusBadge status={c.status} /><span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company}</span></div>
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
                <div className="dv2-topbar-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><StatusBadge status={detail.status} /> {detail.company}</div>
              </div>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-user" label="Contact Person" value={detail.contact_name || '-'} />
              <DvCard icon="fi fi-rr-briefcase" label="Position" value={detail.position || '-'} />
              <DvCard icon="fi fi-rr-envelope" label="Email" value={detail.email || '-'} />
              <DvCard icon="fi fi-rr-phone-call" label="Phone" value={detail.phone || '-'} />
              <DvCard icon="fi fi-rr-shield-check" label="Status" value={detail.status || 'Unverified'} color={STATUS_META[detail.status || 'Unverified']?.color} />
              <DvCard icon="fi fi-rr-credit-card" label="Credit Limit" value={creditLabel(detail.credit_limit)} color="#16a34a" />
            </div>
            <div className="dv2-section-title"><i className="fi fi-rr-marker" /> Company Address</div>
            <div className="dv2-card">
              <div className="dv2-card-icon"><i className="fi fi-rr-home" /></div>
              <div><div className="dv2-card-value" style={{ fontWeight: 500 }}>{detail.address || '-'}</div></div>
            </div>
            <div className="dv2-section-title"><i className="fi fi-rr-briefcase" /> Project</div>
            {cProjects === null ? (
              <div className="dv2-card"><div><div className="dv2-card-value" style={{ fontWeight: 500, color: '#94a3b8' }}>Memuat project...</div></div></div>
            ) : cProjects.length === 0 ? (
              <div className="dv2-card"><div><div className="dv2-card-value" style={{ fontWeight: 500, color: '#94a3b8' }}>Belum ada project untuk client ini.</div></div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cProjects.map((p) => {
                  const c = p.stage === 'Berjalan' ? { bg: '#e8f7f1', fg: '#059669' } : p.stage === 'Selesai' ? { bg: '#eaf1ff', fg: '#3563e9' } : { bg: '#fff4e3', fg: '#b45309' };
                  return (
                    <div key={p.id} className="dv2-card" style={{ alignItems: 'center', gap: 12 }}>
                      <div className="dv2-card-icon"><i className="fi fi-rr-building" /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="dv2-card-value" style={{ fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                          {[p.project_no, p.location].filter(Boolean).join(' · ') || '-'}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                          <span>BOQ: {p.boq}</span><span>·</span><span>Quotation: {p.quotations}</span><span>·</span><span>Sales Order: {p.salesOrders}</span>
                        </div>
                      </div>
                      <span style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, whiteSpace: 'nowrap' }}>{p.stage}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DetailModal>
      )}

      {modalOpen && (
        <FormModal full
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
              <FvField label="Status">
                <FvSelect value={form.status || 'Unverified'} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES.map((x) => ({ value: x, label: x }))} placeholder="Status" />
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
