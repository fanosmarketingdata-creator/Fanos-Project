'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import ProductPicker, { type ProductOption } from '@/components/ProductPicker';
import { saveBOQProject, type BOQAreaInput, type BOQProjectInput } from './actions';

export type ClientOption = { id: string; project_name: string };

function emptyItem(): BOQAreaInput['subAreas'][number]['items'][number] {
  return { product_id: null, sku: '', qty: 1, uom: 'Pcs', kode_gambar: '' };
}
function emptySubArea(): BOQAreaInput['subAreas'][number] {
  return { name: '', items: [emptyItem()] };
}
function emptyArea(): BOQAreaInput {
  return { name: '', subAreas: [emptySubArea()] };
}

export default function BOQProjectForm({
  clients,
  products,
  initial,
}: {
  clients: ClientOption[];
  products: ProductOption[];
  initial?: BOQProjectInput;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [projectName, setProjectName] = useState(initial?.project_name ?? '');
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [boqDate, setBoqDate] = useState(initial?.boq_date ?? new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'DRAFT' | 'APPROVED'>((initial?.status as 'DRAFT' | 'APPROVED') ?? 'DRAFT');
  const [progress, setProgress] = useState<BOQProjectInput['progress']>(initial?.progress ?? 'Pending');
  const [routeType, setRouteType] = useState(initial?.route_type ?? 'quotation');
  const [areas, setAreas] = useState<BOQAreaInput[]>(initial?.areas?.length ? initial.areas : [emptyArea()]);

  function updateArea(ai: number, patch: Partial<BOQAreaInput>) {
    setAreas((prev) => prev.map((a, i) => (i === ai ? { ...a, ...patch } : a)));
  }
  function updateSubArea(ai: number, si: number, patch: Partial<BOQAreaInput['subAreas'][number]>) {
    setAreas((prev) =>
      prev.map((a, i) =>
        i !== ai ? a : { ...a, subAreas: a.subAreas.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
      )
    );
  }
  function updateItem(ai: number, si: number, ii: number, patch: Partial<BOQAreaInput['subAreas'][number]['items'][number]>) {
    setAreas((prev) =>
      prev.map((a, i) =>
        i !== ai
          ? a
          : {
              ...a,
              subAreas: a.subAreas.map((s, j) =>
                j !== si ? s : { ...s, items: s.items.map((it, k) => (k === ii ? { ...it, ...patch } : it)) }
              ),
            }
      )
    );
  }

  function addArea() {
    setAreas((prev) => [...prev, emptyArea()]);
  }
  function removeArea(ai: number) {
    setAreas((prev) => prev.filter((_, i) => i !== ai));
  }
  function addSubArea(ai: number) {
    setAreas((prev) => prev.map((a, i) => (i === ai ? { ...a, subAreas: [...a.subAreas, emptySubArea()] } : a)));
  }
  function removeSubArea(ai: number, si: number) {
    setAreas((prev) =>
      prev.map((a, i) => (i !== ai ? a : { ...a, subAreas: a.subAreas.filter((_, j) => j !== si) }))
    );
  }
  function addItem(ai: number, si: number) {
    setAreas((prev) =>
      prev.map((a, i) =>
        i !== ai
          ? a
          : { ...a, subAreas: a.subAreas.map((s, j) => (j !== si ? s : { ...s, items: [...s.items, emptyItem()] })) }
      )
    );
  }
  function removeItem(ai: number, si: number, ii: number) {
    setAreas((prev) =>
      prev.map((a, i) =>
        i !== ai
          ? a
          : {
              ...a,
              subAreas: a.subAreas.map((s, j) =>
                j !== si ? s : { ...s, items: s.items.filter((_, k) => k !== ii) }
              ),
            }
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveBOQProject({
      id: initial?.id,
      project_name: projectName,
      client_id: clientId,
      boq_date: boqDate,
      status,
      progress: progress as BOQProjectInput['progress'],
      route_type: routeType,
      areas,
    });
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(initial?.id ? 'Data BOQ Project berhasil diperbarui' : 'Data BOQ Project berhasil ditambahkan', 'success');
    router.push('/dashboard/boq-project');
  }

  const totalItems = areas.reduce((n, a) => n + a.subAreas.reduce((m, sb) => m + sb.items.filter((it) => it.sku).length, 0), 0);

  return (
    <DocFormShell
      title={initial?.id ? 'Edit BOQ Project' : 'New BOQ Project'}
      icon="fa-solid fa-layer-group"
      backHref="/dashboard/boq-project"
      saving={saving}
      saveLabel="Simpan"
      onSave={handleSave}
    >
      <Sec title="Informasi Project" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Nama Project" required>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Nama project" />
          </FvField>
          <FvField label="Client" required>
            <SearchSelect
              value={clientId}
              onChange={(v) => setClientId(v)}
              options={clients.map((c) => ({ value: c.id, label: c.project_name }))}
              placeholder="Cari client..."
            />
          </FvField>
          <FvField label="Tanggal BOQ" required>
            <input type="date" value={boqDate} onChange={(e) => setBoqDate(e.target.value)} />
          </FvField>
          <FvField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'APPROVED')}>
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
            </select>
          </FvField>
          <FvField label="Progress">
            <select value={progress} onChange={(e) => setProgress(e.target.value as BOQProjectInput['progress'])}>
              <option value="Pending">Pending</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </FvField>
          <FvField label="Alur Dokumen">
            <select value={routeType} onChange={(e) => setRouteType(e.target.value)}>
              <option value="quotation">Via Quotation</option>
              <option value="so">Langsung ke Sales Order</option>
            </select>
          </FvField>
        </div>
      </Sec>

      <Sec title={`Area & Produk (${totalItems} item)`} icon="fi fi-rr-apps">
        {areas.map((area, ai) => (
          <div key={ai} className="fv2-area">
            <div className="fv2-area-head">
              <span className="ico"><i className="fi fi-rr-building" /></span>
              <input value={area.name} onChange={(e) => updateArea(ai, { name: e.target.value })} placeholder="Nama area (contoh: Lantai 1)" />
              {areas.length > 1 && (
                <button type="button" className="fv2-del-btn" aria-label="Hapus area" onClick={() => removeArea(ai)}>
                  <i className="fi fi-rr-trash" />
                </button>
              )}
            </div>
            <div className="fv2-area-body">
              {area.subAreas.map((sub, si) => (
                <div key={si} className="fv2-sub">
                  <div className="fv2-sub-head">
                    <i className="fi fi-rr-layers" />
                    <input value={sub.name} onChange={(e) => updateSubArea(ai, si, { name: e.target.value })} placeholder="Nama sub-area (contoh: Ruang Tamu)" />
                    {area.subAreas.length > 1 && (
                      <button type="button" className="fv2-del-btn" aria-label="Hapus sub-area" onClick={() => removeSubArea(ai, si)}>
                        <i className="fi fi-rr-cross-small" />
                      </button>
                    )}
                  </div>
                  <div className="fv2-scroll-x">
                    <div style={{ minWidth: 560 }}>
                      <div className="fv2-item-head">
                        <span style={{ flex: 2 }}>Produk (SKU)</span>
                        <span style={{ width: 80 }}>Qty</span>
                        <span style={{ width: 80 }}>UOM</span>
                        <span style={{ flex: 1 }}>Kode Gambar</span>
                        <span style={{ width: 30 }} />
                      </div>
                      {sub.items.map((item, ii) => (
                        <div key={ii} className="fv2-item-row">
                          <div style={{ flex: 2 }}>
                            <ProductPicker products={products} value={item.sku} onSelect={(p) => updateItem(ai, si, ii, { product_id: p.id, sku: p.sku, uom: p.uom })} />
                          </div>
                          <input type="number" style={{ width: 80, flex: 'none' }} value={item.qty} onChange={(e) => updateItem(ai, si, ii, { qty: parseFloat(e.target.value) || 0 })} placeholder="Qty" />
                          <input style={{ width: 80, flex: 'none' }} value={item.uom} onChange={(e) => updateItem(ai, si, ii, { uom: e.target.value })} placeholder="UOM" />
                          <input style={{ flex: 1 }} value={item.kode_gambar} onChange={(e) => updateItem(ai, si, ii, { kode_gambar: e.target.value })} placeholder="Kode Gambar" />
                          <button type="button" className="fv2-del-btn" aria-label="Hapus item" onClick={() => removeItem(ai, si, ii)}>
                            <i className="fi fi-rr-cross-small" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="fv2-add-btn" onClick={() => addItem(ai, si)}>
                    <i className="fi fi-rr-plus" /> Tambah Item
                  </button>
                </div>
              ))}
              <button type="button" className="fv2-add-btn green" onClick={() => addSubArea(ai)}>
                <i className="fi fi-rr-plus" /> Tambah Sub-area
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="fv2-add-btn amber" onClick={addArea}>
          <i className="fi fi-rr-plus" /> Tambah Area
        </button>
      </Sec>
    </DocFormShell>
  );
}
