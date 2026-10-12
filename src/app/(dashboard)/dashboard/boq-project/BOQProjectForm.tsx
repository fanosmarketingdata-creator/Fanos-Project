'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
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
  const [progress, setProgress] = useState<'Pending' | 'InProgress' | 'Completed'>(
    (initial?.progress as 'Pending' | 'InProgress' | 'Completed') ?? 'Pending'
  );
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
    toast(initial?.id ? 'BOQ Project diperbarui' : 'BOQ Project ditambahkan', 'success');
    router.push('/dashboard/boq-project');
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Project Name *</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            >
              <option value="">-- Pilih Client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.project_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal BOQ *</label>
            <input
              type="date"
              value={boqDate}
              onChange={(e) => setBoqDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'APPROVED')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="APPROVED">APPROVED</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Progress</label>
            <select
              value={progress}
              onChange={(e) => setProgress(e.target.value as 'Pending' | 'InProgress' | 'Completed')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            >
              <option value="Pending">Pending</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Route</label>
            <select
              value={routeType}
              onChange={(e) => setRouteType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
            >
              <option value="quotation">Via Quotation</option>
              <option value="so">Langsung ke SO (tanpa quotation)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Areas */}
      <div className="space-y-4">
        {areas.map((area, ai) => (
          <div key={ai} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={area.name}
                onChange={(e) => updateArea(ai, { name: e.target.value })}
                placeholder="Nama Area (mis. Lantai 1)"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              />
              {areas.length > 1 && (
                <button
                  onClick={() => removeArea(ai)}
                  className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  Hapus Area
                </button>
              )}
            </div>

            <div className="ml-4 space-y-3 border-l-2 border-slate-100 pl-4">
              {area.subAreas.map((sub, si) => (
                <div key={si} className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={sub.name}
                      onChange={(e) => updateSubArea(ai, si, { name: e.target.value })}
                      placeholder="Nama Sub-area (mis. Ruang Tamu)"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                    />
                    {area.subAreas.length > 1 && (
                      <button
                        onClick={() => removeSubArea(ai, si)}
                        className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {sub.items.map((item, ii) => (
                      <div key={ii} className="grid grid-cols-[2fr_70px_60px_1fr_auto] items-center gap-2">
                        <ProductPicker
                          products={products}
                          value={item.sku}
                          onSelect={(p) =>
                            updateItem(ai, si, ii, { product_id: p.id, sku: p.sku, uom: p.uom })
                          }
                        />
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItem(ai, si, ii, { qty: parseFloat(e.target.value) || 0 })}
                          placeholder="Qty"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                        />
                        <input
                          value={item.uom}
                          onChange={(e) => updateItem(ai, si, ii, { uom: e.target.value })}
                          placeholder="UOM"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                        />
                        <input
                          value={item.kode_gambar}
                          onChange={(e) => updateItem(ai, si, ii, { kode_gambar: e.target.value })}
                          placeholder="Kode Gambar"
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                        />
                        <button
                          onClick={() => removeItem(ai, si, ii)}
                          className="shrink-0 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addItem(ai, si)}
                    className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    + Tambah Item
                  </button>
                </div>
              ))}
              <button
                onClick={() => addSubArea(ai)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                + Tambah Sub-area
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addArea}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-600"
        >
          + Tambah Area
        </button>
      </div>

      {/* Footer actions */}
      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
        <button
          onClick={() => router.push('/dashboard/boq-project')}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Menyimpan...' : 'Simpan BOQ Project'}
        </button>
      </div>
    </div>
  );
}
