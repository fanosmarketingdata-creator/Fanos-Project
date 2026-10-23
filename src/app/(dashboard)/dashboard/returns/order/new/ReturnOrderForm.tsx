'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import WarehouseField from '@/components/registry/WarehouseField';
import FvSelect from '@/components/registry/FvSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { getReturnableItems, createReturnOrder, type ReturnableItem } from '../../actions';

type InvoiceOption = { id: string; doc_no: string | null; inv_date: string; grand_total: number; client_name: string };
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export default function ReturnOrderForm({ invoices }: { invoices: InvoiceOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [invoiceId, setInvoiceId] = useState('');
  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [cond, setCond] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const inv = invoices.find((i) => i.id === invoiceId);

  async function pick(id: string) {
    setInvoiceId(id);
    setItems([]); setQty({}); setCond({});
    if (!id) return;
    setLoading(true);
    try {
      setItems(await getReturnableItems(id, 'ORDER'));
    } catch (e) {
      toast('Item invoice gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  const total = items.reduce((s, it) => s + (qty[it.sku] || 0) * it.unit_price, 0);
  const totalQty = items.reduce((s, it) => s + (qty[it.sku] || 0), 0);
  const stockIn = items.filter((it) => (cond[it.sku] || 'Baik') === 'Baik').reduce((s, it) => s + (qty[it.sku] || 0), 0);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createReturnOrder({
        invoice_id: invoiceId, return_date: date, reason, doc_no: docNo, warehouse_id: warehouseId,
        items: items.map((it) => ({ sku: it.sku, qty_returned: qty[it.sku] || 0, unit_price: it.unit_price, condition: cond[it.sku] || 'Baik' })),
      });
      if (r.error) return toast(r.error, 'error');
      toast('Return Order berhasil disimpan. Stok barang diperbarui', 'success');
      router.push('/dashboard/returns/order');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell title="New Return Order" icon="fi fi-rr-undo" backHref="/dashboard/returns/order" saving={saving} disabled={totalQty <= 0} saveLabel="Simpan Return Order" onSave={handleSave}>
      <Sec title="Informasi Return Order" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Return ID">
            <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (RO-...)" />
          </FvField>
          <FvField label="Invoice" required>
            <SearchSelect value={invoiceId} onChange={(v) => pick(v)} placeholder="Cari invoice..."
              options={invoices.map((i) => ({ value: i.id, label: `${i.doc_no || '-'} — ${i.client_name}`, sub: `${new Date(i.inv_date).toLocaleDateString('id-ID')} — ${rp(i.grand_total)}` }))} />
          </FvField>
          <FvField label="Client"><input readOnly value={inv?.client_name ?? ''} placeholder="Terisi otomatis dari invoice" /></FvField>
          <FvField label="Tanggal Retur" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
          <WarehouseField label="Gudang Tujuan (Barang Kembali)" value={warehouseId} onChange={setWarehouseId} required />
        </div>
        <div style={{ marginTop: 14 }}>
          <FvField label="Alasan">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Barang rusak atau tidak sesuai spesifikasi" />
          </FvField>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Return Order mencatat barang yang diterima kembali di gudang. Barang berkondisi Baik menambah stok; barang Rusak tidak menambah stok.
        </p>
      </Sec>

      {loading && <div className="dv2-loading"><div className="spinner" />Memuat item invoice...</div>}

      {items.length > 0 && (
        <Sec title="Item yang Diretur" icon="fi fi-rr-list">
          <div className="dv2-table-wrap">
            <table className="dv2-table">
              <thead>
                <tr><th className="tl">SKU</th><th>Di Invoice</th><th>Sudah Diretur</th><th>Dapat Diretur</th><th>Qty Retur</th><th>Kondisi</th><th className="tr">Nilai</th></tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.sku}>
                    <td className="tl"><div style={{ fontWeight: 700 }}>{it.sku}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{it.name}</div></td>
                    <td>{it.invoiced}</td>
                    <td>{it.returned}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>{it.returnable}</td>
                    <td>
                      <input type="number" min={0} max={it.returnable} disabled={it.returnable <= 0} value={qty[it.sku] || 0}
                        onChange={(e) => setQty((p) => ({ ...p, [it.sku]: Math.min(parseFloat(e.target.value) || 0, it.returnable) }))}
                        style={{ width: 80, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center', fontSize: 12.5 }} />
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <FvSelect value={cond[it.sku] || 'Baik'} onChange={(v) => setCond((p) => ({ ...p, [it.sku]: v }))} options={[{ value: 'Baik', label: 'Baik' }, { value: 'Rusak', label: 'Rusak' }]} placeholder="Kondisi" />
                    </td>
                    <td className="tr">{rp((qty[it.sku] || 0) * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>
      )}

      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Total Qty Diretur</span><span>{totalQty}</span></div>
          <div className="dv2-summary-row charge"><span>Masuk Stok Gudang (Kondisi Baik)</span><span>+ {stockIn}</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: '#1a237e' }}>
            <span>Nilai Barang Diretur</span><span>{rp(total)}</span>
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Koreksi piutang dilakukan lewat Return &gt; Invoice (Credit Note).</p>
        </div>
      </Sec>
    </DocFormShell>
  );
}
