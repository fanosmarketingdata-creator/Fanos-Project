'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import WarehouseField from '@/components/registry/WarehouseField';
import FinanceSelect from '@/components/registry/FinanceSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { getReturnableItems, getOrdersForInvoice, getInvoiceFactor, createReturnInvoice, type ReturnableItem } from '../../actions';

type InvoiceOption = { id: string; doc_no: string | null; inv_date: string; grand_total: number; remaining: number; client_name: string };
type OrderOption = { id: string; doc_no: string | null; return_date: string };
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const NONE = '__none__';

export default function ReturnInvoiceForm({ invoices }: { invoices: InvoiceOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [invoiceId, setInvoiceId] = useState('');
  const [orderId, setOrderId] = useState(NONE);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [docNo, setDocNo] = useState('');
  const [cnNo, setCnNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [factor, setFactor] = useState({ discountPercent: 0, taxPercent: 0, factor: 1 });
  const [restock, setRestock] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [settlement, setSettlement] = useState<'CREDIT' | 'REFUND'>('CREDIT');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const inv = invoices.find((i) => i.id === invoiceId);
  const fromOrder = orderId !== NONE;

  async function load(id: string, order: string) {
    setLoading(true);
    try {
      const its = await getReturnableItems(id, 'INVOICE', order !== NONE ? order : undefined);
      setItems(its);
      // dari Return Order: qty langsung terisi sesuai sisa order
      setQty(order !== NONE ? Object.fromEntries(its.map((i) => [i.sku, i.returnable])) : {});
    } catch (e) {
      toast('Item invoice gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function pickInvoice(id: string) {
    setInvoiceId(id); setOrderId(NONE); setOrders([]); setItems([]); setQty({});
    if (!id) return;
    try {
      const [os, f] = await Promise.all([getOrdersForInvoice(id), getInvoiceFactor(id)]);
      setOrders(os); setFactor(f);
    } catch {}
    await load(id, NONE);
  }
  async function pickOrder(v: string) {
    setOrderId(v);
    await load(invoiceId, v);
  }

  const subtotal = items.reduce((s, it) => s + (qty[it.sku] || 0) * it.unit_price, 0);
  const discAmt = subtotal * (factor.discountPercent / 100);
  const taxAmt = (subtotal - discAmt) * (factor.taxPercent / 100);
  const credit = Math.round(subtotal - discAmt + taxAmt);
  const apply = inv ? Math.min(credit, inv.remaining) : 0;
  const leftover = credit - apply;

  async function handleSave() {
    setSaving(true);
    try {
      const r = await createReturnInvoice({
        invoice_id: invoiceId, return_date: date, reason, doc_no: docNo, cn_doc_no: cnNo,
        return_order_id: fromOrder ? orderId : undefined, restock, warehouse_id: warehouseId,
        settlement, refund_method: method, refund_reference: reference,
        items: items.map((it) => ({ sku: it.sku, qty_returned: qty[it.sku] || 0, unit_price: it.unit_price })),
      });
      if (r.error) return toast(r.error, 'error');
      toast(`Return Invoice tersimpan. Credit Note ${rp(r.creditAmount ?? 0)} diterbitkan`, 'success');
      router.push('/dashboard/returns/invoice');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell title="New Return Invoice" icon="fi fi-rr-receipt" backHref="/dashboard/returns/invoice" saving={saving} disabled={credit <= 0} saveLabel="Simpan Return Invoice" onSave={handleSave}>
      <Sec title="Informasi Return Invoice" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Return ID"><input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (RI-...)" /></FvField>
          <FvField label="Credit Note ID"><input value={cnNo} onChange={(e) => setCnNo(e.target.value)} placeholder="Kosongkan untuk otomatis (CN-...)" /></FvField>
          <FvField label="Invoice" required>
            <SearchSelect value={invoiceId} onChange={(v) => pickInvoice(v)} placeholder="Cari invoice..."
              options={invoices.map((i) => ({ value: i.id, label: `${i.doc_no || '-'} — ${i.client_name}`, sub: `${new Date(i.inv_date).toLocaleDateString('id-ID')} — Sisa ${rp(i.remaining)}` }))} />
          </FvField>
          <FvField label="Client"><input readOnly value={inv?.client_name ?? ''} placeholder="Terisi otomatis dari invoice" /></FvField>
          <FvField label="Dari Return Order">
            <SearchSelect value={orderId} onChange={(v) => pickOrder(v || NONE)} placeholder="Tanpa Return Order (retur langsung)"
              options={[{ value: NONE, label: 'Tanpa Return Order (retur langsung)' }, ...orders.map((o) => ({ value: o.id, label: o.doc_no || '-', sub: new Date(o.return_date).toLocaleDateString('id-ID') }))]} disabled={!invoiceId} />
          </FvField>
          <FvField label="Tanggal Retur" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
        </div>
        <div style={{ marginTop: 14 }}>
          <FvField label="Alasan"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Barang rusak atau tidak sesuai spesifikasi" /></FvField>
        </div>
        {!fromOrder && invoiceId && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12.5 }}>
              <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Kembalikan stok ke gudang (tanpa Return Order)
            </label>
            {restock && <div style={{ marginTop: 12, maxWidth: 360 }}><WarehouseField label="Gudang Tujuan (Barang Kembali)" value={warehouseId} onChange={setWarehouseId} required /></div>}
          </>
        )}
        {fromOrder && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Stok sudah bertambah saat Return Order dibuat, jadi tidak ditambah lagi.</p>}
      </Sec>

      {loading && <div className="dv2-loading"><div className="spinner" />Memuat item invoice...</div>}

      {items.length > 0 && (
        <Sec title="Item yang Dikreditkan" icon="fi fi-rr-list">
          <div className="dv2-table-wrap">
            <table className="dv2-table">
              <thead><tr><th className="tl">SKU</th><th>Di Invoice</th><th>Sudah Dikreditkan</th><th>Dapat Dikreditkan</th><th>Qty Retur</th><th className="tr">Nilai</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.sku}>
                    <td className="tl"><div style={{ fontWeight: 700 }}>{it.sku}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{it.name}</div></td>
                    <td>{it.invoiced}</td><td>{it.returned}</td>
                    <td style={{ fontWeight: 700, color: '#16a34a' }}>{it.returnable}</td>
                    <td>
                      <input type="number" min={0} max={it.returnable} disabled={it.returnable <= 0} value={qty[it.sku] || 0}
                        onChange={(e) => setQty((p) => ({ ...p, [it.sku]: Math.min(parseFloat(e.target.value) || 0, it.returnable) }))}
                        style={{ width: 80, border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', textAlign: 'center', fontSize: 12.5 }} />
                    </td>
                    <td className="tr">{rp((qty[it.sku] || 0) * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>
      )}

      <Sec title="Summary & Penyelesaian" icon="fi fi-rr-calculator">
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Subtotal Barang Diretur</span><span>{rp(subtotal)}</span></div>
          <div className="dv2-summary-row discount"><span>Diskon Invoice ({factor.discountPercent}%)</span><span>- {rp(discAmt)}</span></div>
          <div className="dv2-summary-row charge"><span>Pajak Invoice ({factor.taxPercent}%)</span><span>+ {rp(taxAmt)}</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: '#1a237e' }}>
            <span>Nilai Credit Note</span><span>{rp(credit)}</span>
          </div>
          <div className="dv2-summary-row"><span>Memotong Piutang Invoice (sisa {inv ? rp(inv.remaining) : '-'})</span><span>{rp(apply)}</span></div>
          <div className="dv2-summary-row"><span>Saldo Kredit / Refund</span><span>{rp(leftover)}</span></div>
        </div>
        {leftover > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Invoice tidak cukup untuk menyerap seluruh Credit Note. Sisa {rp(leftover)}:</p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12.5 }}>
              <label><input type="radio" checked={settlement === 'CREDIT'} onChange={() => setSettlement('CREDIT')} /> Simpan sebagai saldo kredit client</label>
              <label><input type="radio" checked={settlement === 'REFUND'} onChange={() => setSettlement('REFUND')} /> Refund sekarang</label>
            </div>
            {settlement === 'REFUND' && (
              <div className="fv2-grid" style={{ marginTop: 10 }}>
                <FvField label="Metode Refund"><FinanceSelect kind="payment_method" value={method} onChange={setMethod} /></FvField>
                <FvField label="No. Referensi"><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. transfer / bukti refund" /></FvField>
              </div>
            )}
          </div>
        )}
      </Sec>
    </DocFormShell>
  );
}
