'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import FvSelect from '@/components/registry/FvSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { ProductPickButton } from '@/components/registry/ProductPickerModal';
import type { ProductOption } from '@/components/ProductPicker';
import { createAdjustment } from '../actions';

type Type = 'IN' | 'OUT' | 'OPNAME';
type Line = { sku: string; qty: number; notes: string };
const REASONS: Record<Type, string[]> = {
  IN: ['Sample dari Supplier', 'Temuan Barang Lebih', 'Saldo Awal', 'Lainnya'],
  OUT: ['Rusak / Scrap', 'Kedaluwarsa (Expired)', 'Hilang / Dicuri', 'Sample Keluar', 'Lainnya'],
  OPNAME: ['Opname Selisih'],
};
const TYPES: { value: Type; label: string }[] = [{ value: 'IN', label: 'Stock In (Barang Masuk)' }, { value: 'OUT', label: 'Stock Out (Barang Keluar)' }, { value: 'OPNAME', label: 'Koreksi Selisih (Stock Opname)' }];
const box = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center' as const, fontSize: 12.5, width: 90 };

export default function NewAdjustmentForm({ warehouses, products, stock, defaultWarehouse }: {
  warehouses: { id: string; name: string }[]; products: ProductOption[]; stock: { wh: string; sku: string; qty: number }[]; defaultWarehouse: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [wh, setWh] = useState(defaultWarehouse);
  const [type, setType] = useState<Type>('OUT');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ sku: '', qty: 0, notes: '' }]);
  const [saving, setSaving] = useState(false);

  const stockOf = useMemo(() => {
    const m = new Map<string, number>();
    stock.filter((s) => s.wh === wh).forEach((s) => m.set(s.sku, s.qty));
    return m;
  }, [stock, wh]);
  const uomOf = (sku: string) => products.find((p) => p.sku === sku)?.uom ?? '';
  const set = (i: number, patch: Partial<Line>) => setLines((p) => p.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const diffOf = (l: Line) => (type === 'IN' ? l.qty : type === 'OUT' ? -l.qty : l.qty - (stockOf.get(l.sku) ?? 0));
  const valid = lines.filter((l) => l.sku && (type === 'OPNAME' || l.qty > 0));
  const net = valid.reduce((s, l) => s + diffOf(l), 0);

  function changeType(t: Type) {
    setType(t);
    setReason(t === 'OPNAME' ? 'Opname Selisih' : '');
  }

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createAdjustment({ doc_no: docNo, adj_date: date, warehouse_id: wh, adj_type: type, reason, notes, items: lines.map((l) => ({ sku: l.sku, qty: l.qty, notes: l.notes })) });
      if (r.error) return toast(r.error, 'error');
      toast('Stock Adjustment berhasil disimpan. Stok diperbarui', 'success');
      router.push('/dashboard/stock-adjustment');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell title="New Stock Adjustment" icon="fi fi-rr-edit" backHref="/dashboard/stock-adjustment" saving={saving} disabled={valid.length === 0 || !reason || !wh} saveLabel="Simpan Adjustment" onSave={handleSave}>
      <Sec title="Informasi Adjustment" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Adjustment ID"><input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (ADJ-...)" /></FvField>
          <FvField label="Tanggal" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
          <FvField label="Gudang" required><FvSelect value={wh} onChange={setWh} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} placeholder="Pilih gudang" /></FvField>
          <FvField label="Tipe Adjustment" required><FvSelect value={type} onChange={(v) => changeType(v as Type)} options={TYPES} placeholder="Pilih tipe" /></FvField>
          <FvField label="Alasan / Kategori" required>
            <FvSelect value={reason} onChange={setReason} options={REASONS[type].map((r) => ({ value: r, label: r }))} placeholder="Pilih alasan" />
          </FvField>
          <FvField label="Catatan"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Keterangan tambahan (opsional)" /></FvField>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          {type === 'OPNAME' ? 'Isi jumlah hasil hitung fisik. Sistem menghitung selisihnya terhadap stok saat ini dan menyelaraskannya.' : type === 'OUT' ? 'Stock Out tidak boleh melebihi stok yang tersedia di gudang.' : 'Stock In menambah stok gudang yang dipilih.'}
        </p>
      </Sec>

      <Sec title="Item" icon="fi fi-rr-list">
        <div className="dv2-table-wrap">
          <table className="dv2-table">
            <thead><tr><th className="tl">Produk</th><th>Stok Sistem</th><th>{type === 'OPNAME' ? 'Hasil Hitung Fisik' : 'Qty'}</th><th>Satuan</th><th>Efek Stok</th><th className="tl">Catatan</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const d = l.sku ? diffOf(l) : 0;
                return (
                  <tr key={i}>
                    <td className="tl" style={{ minWidth: 240 }}>
                      <ProductPickButton products={products} value={l.sku} onSelect={(p) => set(i, { sku: p.sku })} />
                    </td>
                    <td>{l.sku ? stockOf.get(l.sku) ?? 0 : '-'}</td>
                    <td><input type="number" min={0} value={l.qty || 0} onChange={(e) => set(i, { qty: parseFloat(e.target.value) || 0 })} style={box} /></td>
                    <td>{uomOf(l.sku) || '-'}</td>
                    <td style={{ fontWeight: 700, color: d >= 0 ? '#16a34a' : '#dc2626' }}>{l.sku ? (d > 0 ? '+' : '') + d : '-'}</td>
                    <td className="tl"><input value={l.notes} onChange={(e) => set(i, { notes: e.target.value })} placeholder="Opsional" style={{ ...box, textAlign: 'left', width: 150 }} /></td>
                    <td><button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, n) => n !== i) : p))} title="Hapus baris"><i className="fi fi-rr-trash" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" className="fv2-add-btn" onClick={() => setLines((p) => [...p, { sku: '', qty: 0, notes: '' }])}><i className="fi fi-rr-plus" /> Tambah Item</button>
      </Sec>

      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Jumlah Item</span><span>{valid.length}</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: net >= 0 ? '#16a34a' : '#dc2626' }}>
            <span>Total Efek Stok</span><span>{net > 0 ? '+' : ''}{net}</span>
          </div>
        </div>
      </Sec>
    </DocFormShell>
  );
}
