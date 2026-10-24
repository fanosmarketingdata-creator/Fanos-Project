'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import FvSelect from '@/components/registry/FvSelect';
import { PACKAGE_TYPES, calcCbm, packageSummary } from '@/lib/packing';
import { getPackingItems, createPackingList } from '../actions';

type SOOption = { id: string; doc_no: string; so_date: string; client_name: string };
type Pack = { package_type: string; units_per_package: number; net_weight: number; gross_weight: number; l: number; w: number; h: number };
type Item = { sku: string; name: string; uom: string; qty: number; packed: number; remaining: number; pack: Pack };
type Line = { sku: string; package_type: string; packages: number; units: number; nw: number; gw: number; l: number; w: number; h: number; remarks: string };
const box = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 6px', textAlign: 'center' as const, fontSize: 12.5 };
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function NewPackingForm({ salesOrders }: { salesOrders: SOOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [soId, setSoId] = useState('');
  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shipTo, setShipTo] = useState('');
  const [packedBy, setPackedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(id: string) {
    setSoId(id); setItems([]); setLines([]); setClientName('');
    if (!id) return;
    setLoading(true);
    try {
      const info = await getPackingItems(id);
      if (!info) return toast('Sales Order tidak ditemukan', 'error');
      setItems(info.items);
      // Default: seluruh sisa SKU dalam 1 kemasan; pecah dengan tombol "Pecah kemasan".
      // Terisi otomatis dari data pengemasan di Product Catalogue (bisa diubah per dokumen).
      const out: Line[] = [];
      info.items.filter((i) => i.remaining > 0).forEach((i) => {
        const pk = i.pack;
        const mk = (packages: number, units: number): Line => ({
          sku: i.sku, package_type: pk.package_type, packages, units,
          nw: r2(pk.net_weight * packages * units), gw: r2(pk.gross_weight * packages), l: pk.l, w: pk.w, h: pk.h, remarks: '',
        });
        if (pk.units_per_package > 0) {
          const full = Math.floor(i.remaining / pk.units_per_package);
          const rest = r2(i.remaining - full * pk.units_per_package);
          if (full > 0) out.push(mk(full, pk.units_per_package));
          if (rest > 0) out.push(mk(1, rest));
        } else out.push(mk(1, i.remaining));
      });
      setLines(out);
      setShipTo(info.address);
      setClientName(info.client_name);
    } catch (e) {
      toast('Item Sales Order gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const set = (i: number, patch: Partial<Line>) => setLines((p) => p.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const lineQty = (l: Line) => l.packages * l.units;
  const usedBy = (sku: string) => lines.filter((l) => l.sku === sku).reduce((s, l) => s + lineQty(l), 0);
  const infoOf = (sku: string) => items.find((i) => i.sku === sku);
  const over = lines.some((l) => usedBy(l.sku) > (infoOf(l.sku)?.remaining ?? 0) + 0.0001);

  const valid = lines.filter((l) => lineQty(l) > 0);
  const tQty = valid.reduce((s, l) => s + lineQty(l), 0);
  const tNw = valid.reduce((s, l) => s + l.nw, 0);
  const tGw = valid.reduce((s, l) => s + l.gw, 0);
  const tCbm = valid.reduce((s, l) => s + calcCbm(l.l, l.w, l.h, l.packages), 0);
  const gwLtNw = valid.some((l) => l.gw > 0 && l.nw > l.gw);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createPackingList({
        so_id: soId, doc_no: docNo, pl_date: date, ship_to: shipTo, packed_by: packedBy, notes,
        items: lines.map((l) => ({ sku: l.sku, package_type: l.package_type, packages: l.packages, units_per_package: l.units, net_weight: l.nw, gross_weight: l.gw, length_cm: l.l, width_cm: l.w, height_cm: l.h, remarks: l.remarks })),
      });
      if (r.error) return toast(r.error, 'error');
      toast('Packing List berhasil disimpan', 'success');
      router.push('/dashboard/packing-list');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell title="New Packing List" icon="fi fi-rr-box-open" backHref="/dashboard/packing-list" saving={saving} disabled={tQty <= 0 || over} saveLabel="Simpan Packing List" onSave={handleSave}>
      <Sec title="Informasi Packing List" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Packing List ID"><input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (PL-...)" /></FvField>
          <FvField label="Sales Order (VERIFIED)" required>
            <SearchSelect value={soId} onChange={(v) => pick(v)} placeholder="Cari Sales Order..."
              options={salesOrders.map((s) => ({ value: s.id, label: `${s.doc_no || '-'} — ${s.client_name}`, sub: new Date(s.so_date).toLocaleDateString('id-ID') }))} />
          </FvField>
          <FvField label="Client"><input readOnly value={clientName} placeholder="Terisi otomatis dari Sales Order" /></FvField>
          <FvField label="Tanggal" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
          <FvField label="Dikemas Oleh"><input value={packedBy} onChange={(e) => setPackedBy(e.target.value)} placeholder="Nama petugas packing" /></FvField>
        </div>
        <div style={{ marginTop: 14 }}>
          <FvField label="Alamat Pengiriman"><input value={shipTo} onChange={(e) => setShipTo(e.target.value)} placeholder="Terisi dari alamat client, dapat diubah" /></FvField>
        </div>
        <div style={{ marginTop: 14 }}>
          <FvField label="Catatan"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: Fragile / jangan ditumpuk" /></FvField>
        </div>
        {salesOrders.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Belum ada Sales Order berstatus VERIFIED.</p>}
      </Sec>

      {loading && <div className="dv2-loading"><div className="spinner" />Memuat item Sales Order...</div>}

      {lines.length > 0 && (
        <Sec title="Detail Kemasan" icon="fi fi-rr-list">
          <div className="dv2-table-wrap">
            <table className="dv2-table">
              <thead>
                <tr>
                  <th className="tl">Barang (SKU)</th><th>Sisa SO</th><th>Jenis Kemasan</th><th>Jumlah Kemasan</th><th>Unit / Kemasan</th><th>Total Qty</th>
                  <th>Berat Bersih NW (Kg)</th><th>Berat Kotor GW (Kg)</th><th>P (cm)</th><th>L (cm)</th><th>T (cm)</th><th>CBM</th><th className="tl">Keterangan</th><th />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const it = infoOf(l.sku);
                  const bad = usedBy(l.sku) > (it?.remaining ?? 0) + 0.0001;
                  return (
                    <tr key={i}>
                      <td className="tl"><div style={{ fontWeight: 700 }}>{l.sku}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{it?.name}</div></td>
                      <td style={{ fontWeight: 700, color: bad ? '#dc2626' : '#16a34a' }}>{it?.remaining ?? 0}</td>
                      <td style={{ minWidth: 120 }}><FvSelect value={l.package_type} onChange={(v) => set(i, { package_type: v })} options={PACKAGE_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Jenis" /></td>
                      <td><input type="number" min={0} value={l.packages || 0} onChange={(e) => set(i, { packages: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 70 }} /></td>
                      <td><input type="number" min={0} value={l.units || 0} onChange={(e) => set(i, { units: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 80 }} /></td>
                      <td style={{ fontWeight: 700, color: bad ? '#dc2626' : undefined }}>{r2(lineQty(l))}</td>
                      <td><input type="number" min={0} step="0.01" value={l.nw || 0} onChange={(e) => set(i, { nw: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 80 }} /></td>
                      <td><input type="number" min={0} step="0.01" value={l.gw || 0} onChange={(e) => set(i, { gw: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 80 }} /></td>
                      <td><input type="number" min={0} value={l.l || 0} onChange={(e) => set(i, { l: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 60 }} /></td>
                      <td><input type="number" min={0} value={l.w || 0} onChange={(e) => set(i, { w: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 60 }} /></td>
                      <td><input type="number" min={0} value={l.h || 0} onChange={(e) => set(i, { h: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 60 }} /></td>
                      <td>{calcCbm(l.l, l.w, l.h, l.packages).toFixed(3)}</td>
                      <td className="tl"><input value={l.remarks} onChange={(e) => set(i, { remarks: e.target.value })} placeholder="Opsional" style={{ ...box, textAlign: 'left', width: 120 }} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn-action-icon btn-edit btn-xs" title="Pecah kemasan (tambah baris untuk SKU ini)" onClick={() => setLines((p) => [...p.slice(0, i + 1), { ...l, packages: 1, units: 0, nw: 0, gw: 0 }, ...p.slice(i + 1)])}><i className="fi fi-rr-plus" /></button>{' '}
                        <button type="button" className="btn-action-icon btn-delete btn-xs" title="Hapus baris" onClick={() => setLines((p) => (p.filter((x) => x.sku === l.sku).length > 1 ? p.filter((_, n) => n !== i) : p))}><i className="fi fi-rr-trash" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
            Total Qty = Jumlah Kemasan × Unit per Kemasan. NW dan GW diisi total per baris (Kg). CBM = P × L × T (cm) ÷ 1.000.000 × Jumlah Kemasan. Packing List tidak memuat harga.
          </p>
          {over && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Total qty suatu SKU melebihi sisa yang belum dikemas.</p>}
          {gwLtNw && <p style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>Berat kotor (GW) seharusnya tidak lebih kecil dari berat bersih (NW).</p>}
        </Sec>
      )}

      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Total Jumlah Kemasan</span><span>{packageSummary(valid.map((l) => ({ package_type: l.package_type, packages: l.packages })))}</span></div>
          <div className="dv2-summary-row"><span>Total Qty</span><span>{r2(tQty)}</span></div>
          <div className="dv2-summary-row"><span>Total Berat Bersih (NW)</span><span>{r2(tNw)} Kg</span></div>
          <div className="dv2-summary-row"><span>Total Berat Kotor (GW)</span><span>{r2(tGw)} Kg</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: '#1a237e' }}><span>Total Volume (CBM)</span><span>{tCbm.toFixed(3)} CBM</span></div>
        </div>
      </Sec>
    </DocFormShell>
  );
}
