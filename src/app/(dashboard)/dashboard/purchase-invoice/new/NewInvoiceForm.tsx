'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { createPurchaseInvoice, getPOLinesForInvoice, type InvoiceLine } from '../actions';

type PO = { id: string; doc_no: string; po_date: string; status: string; vendor: string };
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const box = { border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'right' as const, fontSize: 12.5, width: 120 };

export default function NewInvoiceForm({ pos, initialPo }: { pos: PO[]; initialPo: string }) {
  const router = useRouter();
  const toast = useToast();
  const [poId, setPoId] = useState('');
  const [docNo, setDocNo] = useState('');
  const [vendorInv, setVendorInv] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [due, setDue] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pick(id: string) {
    setPoId(id); setLines([]);
    if (!id) return;
    setLoading(true);
    try {
      const r = await getPOLinesForInvoice(id);
      if (!r) return toast('Purchase Order tidak ditemukan', 'error');
      setLines(r.lines);
      // Jatuh tempo otomatis dari TOP vendor bila berupa angka hari (mis. "30 Hari").
      const days = parseInt((r.terms || '').replace(/\D+/g, ''), 10);
      if (days > 0) { const d = new Date(date); d.setDate(d.getDate() + days); setDue(d.toISOString().split('T')[0]); }
    } catch (e) {
      toast('Item PO gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (initialPo) pick(initialPo); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const set = (i: number, patch: Partial<InvoiceLine>) => setLines((p) => p.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
  const discAmt = (subtotal * discount) / 100;
  const taxAmt = ((subtotal - discAmt) * tax) / 100;
  const grand = Math.round(subtotal - discAmt + taxAmt);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createPurchaseInvoice({ doc_no: docNo, inv_date: date, due_date: due, purchase_order_id: poId, vendor_invoice_no: vendorInv, discount_percent: discount, tax_percent: tax, notes, lines });
      if (r.error) return toast(r.error, 'error');
      toast('Purchase Invoice berhasil disimpan', 'success');
      router.push('/dashboard/purchase-invoice');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell title="New Purchase Invoice" icon="fi fi-rr-file-invoice-dollar" backHref="/dashboard/purchase-invoice" saving={saving} disabled={!poId || grand <= 0} saveLabel="Simpan Invoice" onSave={handleSave}>
      <Sec title="Informasi Invoice" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Invoice ID"><input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (PI-...)" /></FvField>
          <FvField label="No. Invoice Vendor"><input value={vendorInv} onChange={(e) => setVendorInv(e.target.value)} placeholder="Nomor faktur dari vendor" /></FvField>
          <FvField label="Purchase Order" required>
            <SearchSelect value={poId} onChange={pick} placeholder="Cari PO..." options={pos.map((p) => ({ value: p.id, label: `${p.doc_no} — ${p.vendor}`, sub: p.status }))} />
          </FvField>
          <FvField label="Tanggal Invoice" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
          <FvField label="Jatuh Tempo"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></FvField>
          <FvField label="Catatan"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" /></FvField>
        </div>
      </Sec>
      <Sec title="Item Invoice" icon="fi fi-rr-list">
        {loading && <div className="dv2-loading"><div className="spinner" />Memuat item PO...</div>}
        {!loading && lines.length === 0 && <p style={{ fontSize: 12, color: '#9ca3af' }}>Pilih Purchase Order untuk menampilkan itemnya. Qty dan harga bisa disesuaikan dengan faktur vendor.</p>}
        {lines.length > 0 && (
          <div className="dv2-table-wrap">
            <table className="dv2-table">
              <thead><tr><th className="tl">SKU</th><th className="tl">Deskripsi</th><th>Qty</th><th>Satuan</th><th>Harga Beli</th><th>Subtotal</th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={l.po_item_id}>
                    <td className="tl">{l.sku}</td><td className="tl">{l.description || '-'}</td>
                    <td><input type="number" min={0} value={l.qty} onChange={(e) => set(i, { qty: parseFloat(e.target.value) || 0 })} style={{ ...box, width: 80 }} /></td>
                    <td>{l.uom || '-'}</td>
                    <td><input type="number" min={0} value={l.unit_price} onChange={(e) => set(i, { unit_price: parseFloat(e.target.value) || 0 })} style={box} /></td>
                    <td>{rp(l.qty * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Sec>
      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-grid" style={{ marginBottom: 12 }}>
          <FvField label="Diskon (%)"><input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} /></FvField>
          <FvField label="Pajak / PPN (%)"><input type="number" min={0} value={tax} onChange={(e) => setTax(parseFloat(e.target.value) || 0)} /></FvField>
        </div>
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Sub Total</span><span>{rp(subtotal)}</span></div>
          <div className="dv2-summary-row discount"><span>Diskon ({discount}%)</span><span>- {rp(discAmt)}</span></div>
          <div className="dv2-summary-row charge"><span>Pajak ({tax}%)</span><span>{rp(taxAmt)}</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: '#1a237e' }}><span>Grand Total</span><span>{rp(grand)}</span></div>
        </div>
      </Sec>
    </DocFormShell>
  );
}
