'use client';

import { useMemo, useState } from 'react';
import RowActions from '@/components/ui/RowActions';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import { FormModal, DeleteModal, FvField } from '@/components/registry/RegistryModal';
import FvSelect from '@/components/registry/FvSelect';
import { saveLightingSpec, syncLightingSpec, deleteLightingSpec, getBOQSynthesis } from './actions';

export type SpecItemRow = {
  key: string;
  product_id: string | null;
  sku: string;
  name: string;
  uom: string;
  qty: number;
  boq_qty: number | null;
  drawing_code: string;
  flag: 'new' | 'qty' | 'removed' | null;
  image_url: string | null;
  spec: string[];
};
export type SpecRow = {
  id: string;
  boq_project_id: string;
  project_name: string;
  client: string;
  notes: string;
  items: SpecItemRow[];
  outdated: boolean;
};
export type BoqOption = { value: string; label: string };

const FLAG_META = {
  new: { label: 'Item baru di BOQ', bg: '#dbeafe', color: '#1d4ed8' },
  qty: { label: 'Qty berubah', bg: '#fef3c7', color: '#92400e' },
  removed: { label: 'Dihapus dari BOQ', bg: '#fee2e2', color: '#991b1b' },
} as const;

function FlagBadge({ flag }: { flag: SpecItemRow['flag'] }) {
  if (!flag) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
  const m = FLAG_META[flag];
  return <span style={{ background: m.bg, color: m.color, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.label}</span>;
}

export default function LightingSpecTable({ initialRows, boqOptions }: { initialRows: SpecRow[]; boqOptions: BoqOption[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [boqId, setBoqId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SpecItemRow[]>([]);
  const [loadingBoq, setLoadingBoq] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SpecRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? initialRows.filter((r) => [r.project_name, r.client].some((v) => v.toLowerCase().includes(q))) : initialRows;
  }, [initialRows, search]);

  const current = editId ? initialRows.find((r) => r.id === editId) : undefined;
  const outdated = !!current && (current.outdated);

  function openAdd() {
    setEditId(undefined);
    setBoqId('');
    setNotes('');
    setItems([]);
    setModalOpen(true);
  }
  function openEdit(r: SpecRow) {
    setEditId(r.id);
    setBoqId(r.boq_project_id);
    setNotes(r.notes);
    setItems(r.items);
    setModalOpen(true);
  }

  async function pickBoq(id: string) {
    setBoqId(id);
    setItems([]);
    if (!id) return;
    setLoadingBoq(true);
    try {
      const list = await getBOQSynthesis(id);
      setItems(list.map((l) => ({ key: '', product_id: l.product_id, sku: l.sku, name: l.name, uom: l.uom, qty: l.qty, boq_qty: l.qty, drawing_code: '', flag: null, image_url: l.image_url, spec: l.spec })));
      if (!list.length) toast('BOQ ini belum memiliki item.', 'error');
    } catch {
      toast('Item BOQ gagal dimuat.', 'error');
    } finally {
      setLoadingBoq(false);
    }
  }

  const setCode = (i: number, v: string) => setItems((prev) => prev.map((it, k) => (k === i ? { ...it, drawing_code: v } : it)));

  async function handleSave() {
    setSaving(true);
    try {
      // Item "dihapus dari BOQ" tidak ikut disimpan; item baru ikut dengan qty BOQ terbaru.
      const payload = items
        .filter((it) => it.flag !== 'removed')
        .map((it) => ({ product_id: it.product_id, sku: it.sku, uom: it.uom, qty: it.flag === 'new' || it.flag === 'qty' ? it.boq_qty ?? it.qty : it.qty, drawing_code: it.drawing_code }));
      const r = await saveLightingSpec({ id: editId, boq_project_id: boqId, notes, items: payload });
      if (r.error) return toast(r.error, 'error');
      toast(editId ? 'Data Lighting Specification berhasil diperbarui' : 'Data Lighting Specification berhasil ditambahkan', 'success');
      setModalOpen(false);
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    if (!editId) return;
    setSyncing(true);
    try {
      const codes: Record<string, string> = {};
      items.forEach((it) => { if (it.key) codes[it.key] = it.drawing_code; });
      const r = await syncLightingSpec(editId, codes);
      if (r.error) return toast(r.error, 'error');
      toast('Data berhasil diperbarui dari BOQ', 'success');
      setModalOpen(false);
    } catch (e) {
      toast('Data gagal diperbarui: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await deleteLightingSpec(deleteTarget.id);
      if (r.error) return toast(r.error, 'error');
      toast('Data Lighting Specification berhasil dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  const filled = items.filter((i) => i.drawing_code.trim()).length;

  return (
    <RegistryCard
      title="Lighting Specification"
      icon="fi fi-rr-bulb"
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel="New Specification"
      addIcon="fi fi-rr-plus"
      onAdd={openAdd}
    >
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="w-12 px-4 py-3 font-semibold">No</th>
              <th className="px-4 py-3 font-semibold">Project</th>
              <th className="px-4 py-3 font-semibold">Client</th>
              <th className="px-4 py-3 text-center font-semibold">Item</th>
              <th className="px-4 py-3 text-center font-semibold">Drawing Code</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Belum terdapat data lighting specification</td></tr>
            )}
            {filtered.map((r, idx) => {
              const changed = r.items.filter((i) => i.flag).length;
              const count = r.items.filter((i) => i.flag !== 'new').length;
              return (
                <tr key={r.id} className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/60" onClick={() => openEdit(r)}>
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.project_name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.client}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{count}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{r.items.filter((i) => i.drawing_code).length} / {count}</td>
                  <td className="px-4 py-3">
                    {r.outdated
                      ? <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}><i className="fi fi-rr-refresh" /> <span>Perlu update</span> ({changed})</span>
                      : <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>Sesuai BOQ</span>}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      actions={[
                        { label: 'Cetak', icon: 'fi fi-rr-print', href: `/dashboard/lighting-specification/${r.id}/print` },
                        { label: 'Edit', icon: 'fi fi-rr-pencil', onClick: () => openEdit(r) },
                        { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setDeleteTarget(r) },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <FormModal
          full
          title={editId ? 'Edit Lighting Specification' : 'New Lighting Specification'}
          icon="fi fi-rr-bulb"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || syncing || !boqId || items.length === 0}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              {outdated && (
                <button type="button" className="btn btn-secondary" onClick={handleSync} disabled={saving || syncing}>
                  <i className="fi fi-rr-refresh" /> {syncing ? 'Memperbarui...' : 'Update dari BOQ'}
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-layers" /> Sumber BOQ</div>
            <div className="fv2-grid">
              <FvField label="BOQ Project" required>
                {editId ? (
                  <input value={current?.project_name ?? ''} readOnly />
                ) : (
                  <FvSelect value={boqId} onChange={pickBoq} options={boqOptions} placeholder="Cari BOQ Project..." />
                )}
              </FvField>
              <FvField label="Notes">
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan (opsional)" />
              </FvField>
            </div>
            {!editId && boqOptions.length === 0 && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Semua BOQ Project sudah memiliki Lighting Specification.</p>}
          </div>

          {outdated && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
              <b><i className="fi fi-rr-exclamation" /> Item di BOQ berubah.</b> Klik <b>Update dari BOQ</b> untuk menyamakan data. Kode gambar yang sudah diisi tetap dipertahankan.
            </div>
          )}

          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-list" /> Item Specification {items.length > 0 && <span style={{ fontWeight: 500, color: '#64748b' }}>({filled}/{items.filter((i) => i.flag !== 'removed').length} <span>Kode Gambar</span>)</span>}</div>
            {loadingBoq && <p style={{ fontSize: 12, color: '#94a3b8' }}>Memuat item dari BOQ Project...</p>}
            {!loadingBoq && items.length === 0 && <p style={{ fontSize: 13, color: '#94a3b8' }}>Pilih BOQ Project untuk memuat item.</p>}
            {items.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="dv2-table" style={{ minWidth: 1000 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th style={{ minWidth: 170 }}>Drawing Code</th>
                      <th style={{ textAlign: 'left' }}>Product</th>
                      <th style={{ minWidth: 260, textAlign: 'left' }}>Specification</th>
                      <th style={{ width: 116 }}>Picture Reference</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th>UOM</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.key + it.sku + i} style={it.flag === 'removed' ? { opacity: 0.55 } : undefined}>
                        <td>{i + 1}</td>
                        <td>
                          <input
                            value={it.drawing_code}
                            onChange={(e) => setCode(i, e.target.value)}
                            placeholder="Kode gambar"
                            disabled={it.flag === 'removed'}
                            style={{ width: '100%', minWidth: 150, border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 13, background: '#fff' }}
                          />
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700 }}>{it.sku}</div>
                          <div>{it.name || '-'}</div>
                        </td>
                        <td style={{ fontSize: 12, lineHeight: 1.5, color: '#475569', textAlign: 'left' }}>
                          {it.spec.map((l, k) => <div key={k}>{l}</div>)}
                        </td>
                        <td>
                          {it.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image_url} alt={it.sku} style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 8, border: '1px solid #e8ecf4', background: '#fff' }} />
                          ) : (
                            <div style={{ width: 96, height: 96, borderRadius: 8, border: '1px dashed #e2e8f0', background: '#f8fafc' }} />
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {it.flag === 'qty' || it.flag === 'new'
                            ? <><s style={{ color: '#94a3b8' }}>{it.flag === 'qty' ? it.qty : ''}</s> <b>{it.boq_qty}</b></>
                            : it.qty}
                        </td>
                        <td>{it.uom || '-'}</td>
                        <td><FlagBadge flag={it.flag} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <DeleteModal
          title="Konfirmasi Hapus"
          itemName={deleteTarget.project_name}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </RegistryCard>
  );
}
