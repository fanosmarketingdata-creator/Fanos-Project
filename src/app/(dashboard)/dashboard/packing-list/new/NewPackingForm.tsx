'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { getPackingItems, createPackingList } from '../actions';

type SOOption = { id: string; doc_no: string; so_date: string; client_name: string };
type Item = { sku: string; name: string; uom: string; qty: number; packed: number; remaining: number };
const box = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center' as const, fontSize: 12.5 };

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
  const [qty, setQty] = useState<Record<string, number>>({});
  const [colli, setColli] = useState<Record<string, number>>({});
  const [weight, setWeight] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(id: string) {
    setSoId(id); setItems([]); setQty({}); setColli({}); setWeight({}); setRemarks({}); setClientName('');
    if (!id) return;
    setLoading(true);
    try {
      const info = await getPackingItems(id);
      if (!info) return toast('Sales Order tidak ditemukan', 'error');
      setItems(info.items);
      setQty(Object.fromEntries(info.items.map((i) => [i.sku, i.remaining])));
      setShipTo(info.address);
      setClientName(info.client_name);
    } catch (e) {
      toast('Item Sales Order gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const tQty = items.reduce((s, i) => s + (qty[i.sku] || 0), 0);
  const tColli = items.reduce((s, i) => s + ((qty[i.sku] || 0) > 0 ? colli[i.sku] || 0 : 0), 0);
  const tWeight = items.reduce((s, i) => s + ((qty[i.sku] || 0) > 0 ? weight[i.sku] || 0 : 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createPackingList({
        so_id: soId, doc_no: docNo, pl_date: date, ship_to: shipTo, packed_by: packedBy, notes,
        items: items.map((i) => ({ sku: i.sku, qty: qty[i.sku] || 0, colli: colli[i.sku] || 0, weight: weight[i.sku] || 0, remarks: remarks[i.sku] })),
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
    <DocFormShell title="New Packing List" icon="fi fi-rr-box-open" backHref="/dashboard/packing-list" saving={saving} disabled={tQty <= 0} saveLabel="Simpan Packing List" onSave={handleSave}>
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

      {items.length > 0 && (
        <Sec title="Item yang Dikemas" icon="fi fi-rr-list">
          <div className="dv2-table-wrap">
            <table className="dv2-table">
              <thead><tr><th className="tl">SKU</th><th>Di SO</th><th>Sudah Dikemas</th><th>Sisa</th><th>Qty Kemas</th><th>Koli</th><th>Berat (Kg)</th><th className="tl">Keterangan</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.sku}>
                    <td className="tl"><div style={{ fontWeight: 700 }}>{it.sku}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{it.name}</div></td>
                    <td>{it.qty}</td><td>{it.packed}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>{it.remaining}</td>
                    <td><input type="number" min={0} max={it.remaining} disabled={it.remaining <= 0} value={qty[it.sku] || 0} onChange={(e) => setQty((p) => ({ ...p, [it.sku]: Math.min(parseFloat(e.target.value) || 0, it.remaining) }))} style={{ ...box, width: 80 }} /></td>
                    <td><input type="number" min={0} value={colli[it.sku] || 0} onChange={(e) => setColli((p) => ({ ...p, [it.sku]: parseFloat(e.target.value) || 0 }))} style={{ ...box, width: 70 }} /></td>
                    <td><input type="number" min={0} step="0.01" value={weight[it.sku] || 0} onChange={(e) => setWeight((p) => ({ ...p, [it.sku]: parseFloat(e.target.value) || 0 }))} style={{ ...box, width: 80 }} /></td>
                    <td className="tl"><input value={remarks[it.sku] || ''} onChange={(e) => setRemarks((p) => ({ ...p, [it.sku]: e.target.value }))} placeholder="Opsional" style={{ ...box, textAlign: 'left', width: 150 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>
      )}

      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Total Qty Dikemas</span><span>{tQty}</span></div>
          <div className="dv2-summary-row"><span>Total Koli</span><span>{tColli}</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: '#1a237e' }}><span>Total Berat (Kg)</span><span>{tWeight}</span></div>
        </div>
      </Sec>
    </DocFormShell>
  );
}
