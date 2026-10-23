'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import FvSelect from '@/components/registry/FvSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { ProductPickButton } from '@/components/registry/ProductPickerModal';
import type { ProductOption } from '@/components/ProductPicker';
import { createTransfer } from '../actions';

type Line = { sku: string; qty: number };
const box = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center' as const, fontSize: 12.5, width: 90 };

export default function NewTransferForm({ warehouses, products, stock, defaultWarehouse }: {
  warehouses: { id: string; name: string }[]; products: ProductOption[]; stock: { wh: string; sku: string; qty: number }[]; defaultWarehouse: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [from, setFrom] = useState(defaultWarehouse);
  const [to, setTo] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ sku: '', qty: 0 }]);
  const [saving, setSaving] = useState(false);

  const stockOf = useMemo(() => {
    const m = new Map<string, number>();
    stock.filter((s) => s.wh === from).forEach((s) => m.set(s.sku, s.qty));
    return m;
  }, [stock, from]);
  const set = (i: number, patch: Partial<Line>) => setLines((p) => p.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const valid = lines.filter((l) => l.sku && l.qty > 0);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createTransfer({ doc_no: docNo, transfer_date: date, from_warehouse_id: from, to_warehouse_id: to, notes, items: lines });
      if (r.error) return toast(r.error, 'error');
      toast('Stock Transfer disimpan sebagai Draft. Klik Kirim untuk memproses', 'success');
      router.push('/dashboard/stock-transfer');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const opts = warehouses.map((w) => ({ value: w.id, label: w.name }));
  return (
    <DocFormShell title="New Stock Transfer" icon="fi fi-rr-exchange" backHref="/dashboard/stock-transfer" saving={saving} disabled={valid.length === 0 || !from || !to} saveLabel="Simpan Draft" onSave={handleSave}>
      <Sec title="Informasi Transfer" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Transfer ID"><input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (TRF-...)" /></FvField>
          <FvField label="Tanggal Kirim" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
          <FvField label="Gudang Asal" required><FvSelect value={from} onChange={setFrom} options={opts} placeholder="Pilih gudang asal" /></FvField>
          <FvField label="Gudang Tujuan" required><FvSelect value={to} onChange={setTo} options={opts.filter((o) => o.value !== from)} placeholder="Pilih gudang tujuan" /></FvField>
          <FvField label="Catatan"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" /></FvField>
        </div>
      </Sec>
      <Sec title="Item" icon="fi fi-rr-list">
        <div className="dv2-table-wrap">
          <table className="dv2-table">
            <thead><tr><th className="tl">Produk</th><th>Stok Gudang Asal</th><th>Qty Kirim</th><th>Satuan</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const have = stockOf.get(l.sku) ?? 0;
                return (
                  <tr key={i}>
                    <td className="tl" style={{ minWidth: 240 }}><ProductPickButton products={products} value={l.sku} onSelect={(p) => set(i, { sku: p.sku })} /></td>
                    <td>{l.sku ? have : '-'}</td>
                    <td><input type="number" min={0} value={l.qty || 0} onChange={(e) => set(i, { qty: parseFloat(e.target.value) || 0 })} style={{ ...box, borderColor: l.sku && l.qty > have ? '#dc2626' : '#e5e7eb' }} /></td>
                    <td>{products.find((p) => p.sku === l.sku)?.uom ?? '-'}</td>
                    <td><button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, n) => n !== i) : p))} title="Hapus baris"><i className="fi fi-rr-trash" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" className="fv2-add-btn" onClick={() => setLines((p) => [...p, { sku: '', qty: 0 }])}><i className="fi fi-rr-plus" /> Tambah Item</button>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Stok baru berkurang saat Anda menekan Kirim di daftar transfer, dan bertambah di gudang tujuan saat Terima.</p>
      </Sec>
    </DocFormShell>
  );
}
