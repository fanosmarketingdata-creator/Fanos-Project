'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import WarehouseField from '@/components/registry/WarehouseField';
import { FvField } from '@/components/registry/RegistryModal';
import { createPurchaseDelivery, getPOReceivable, type Receivable } from '../actions';

type PO = { id: string; doc_no: string; po_date: string; vendor: string };
const box = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center' as const, fontSize: 12.5, width: 90 };

export default function NewReceiptForm({ pos, initialPo }: { pos: PO[]; initialPo: string }) {
  const router = useRouter();
  const toast = useToast();
  const [poId, setPoId] = useState('');
  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouseId, setWarehouseId] = useState('');
  const [vendorDo, setVendorDo] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Receivable[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(id: string) {
    setPoId(id); setItems([]); setQty({});
    if (!id) return;
    setLoading(true);
    try {
      const r = await getPOReceivable(id);
      setItems(r);
      setQty(Object.fromEntries(r.map((i) => [i.po_item_id, i.remaining])));
    } catch (e) {
      toast('Item PO gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (initialPo) pick(initialPo); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const total = items.reduce((s, i) => s + (qty[i.po_item_id] || 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createPurchaseDelivery({
        doc_no: docNo, gr_date: date, purchase_order_id: poId, warehouse_id: warehouseId, vendor_do_no: vendorDo, notes,
        items: items.map((i) => ({ po_item_id: i.po_item_id, sku: i.sku, qty: qty[i.po_item_id] || 0 })),
      });
      if (r.error) return toast(r.error, 'error');
      toast('Purchase Delivery berhasil disimpan. Stok bertambah', 'success');
      router.push('/dashboard/purchase-delivery');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell title="New Purchase Delivery" icon="fa-solid fa-dolly" backHref="/dashboard/purchase-delivery" saving={saving} disabled={!poId || !warehouseId || total <= 0} saveLabel="Simpan Penerimaan" onSave={handleSave}>
      <Sec title="Informasi Penerimaan" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Delivery ID"><input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (GR-...)" /></FvField>
          <FvField label="Tanggal Terima" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
          <FvField label="Purchase Order" required>
            <SearchSelect value={poId} onChange={pick} placeholder="Cari PO (status ORDERED)..."
              options={pos.map((p) => ({ value: p.id, label: `${p.doc_no} — ${p.vendor}`, sub: new Date(p.po_date).toLocaleDateString('id-ID') }))} />
          </FvField>
          <WarehouseField label="Gudang Penerima" value={warehouseId} onChange={setWarehouseId} required />
          <FvField label="No. Surat Jalan Vendor"><input value={vendorDo} onChange={(e) => setVendorDo(e.target.value)} placeholder="Opsional" /></FvField>
          <FvField label="Catatan"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" /></FvField>
        </div>
        {pos.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Belum ada PO berstatus ORDERED. Ubah status PO menjadi di-order terlebih dahulu di menu Purchase Order.</p>}
      </Sec>
      <Sec title="Item Diterima" icon="fi fi-rr-list">
        {loading && <div className="dv2-loading"><div className="spinner" />Memuat item PO...</div>}
        {!loading && items.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>Pilih Purchase Order untuk menampilkan itemnya.</p>}
        {items.length > 0 && (
          <div className="dv2-table-wrap">
            <table className="dv2-table">
              <thead><tr><th className="tl">SKU</th><th className="tl">Nama Produk</th><th>Dipesan</th><th>Sudah Diterima</th><th>Sisa</th><th>Qty Diterima</th><th>Satuan</th></tr></thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.po_item_id}>
                    <td className="tl">{i.sku}</td>
                    <td className="tl">{i.name || '-'}</td>
                    <td>{i.ordered}</td><td>{i.received}</td><td>{i.remaining}</td>
                    <td><input type="number" min={0} max={i.remaining} disabled={i.remaining <= 0} value={qty[i.po_item_id] ?? 0} onChange={(e) => setQty((p) => ({ ...p, [i.po_item_id]: Math.min(i.remaining, Math.max(0, parseFloat(e.target.value) || 0)) }))} style={box} /></td>
                    <td>{i.uom || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Sec>
      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-summary"><div className="dv2-summary-row"><span>Total Qty Diterima</span><span>{total}</span></div></div>
      </Sec>
    </DocFormShell>
  );
}
