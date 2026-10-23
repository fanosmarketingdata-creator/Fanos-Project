'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import FinanceSelect from '@/components/registry/FinanceSelect';
import { FvField } from '@/components/registry/RegistryModal';
import RupiahInput from '@/components/ui/RupiahInput';
import { savePurchasePayment } from '../actions';

type Inv = { id: string; doc_no: string | null; vendor: string; grand_total: number; total_paid: number; paid_discount: number; remaining: number };
const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export default function PaymentForm({ invoices, preset }: { invoices: Inv[]; preset: string }) {
  const router = useRouter();
  const toast = useToast();
  const [invoiceId, setInvoiceId] = useState(invoices.some((i) => i.id === preset) ? preset : '');
  const [docNo, setDocNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState('');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const inv = invoices.find((i) => i.id === invoiceId);
  const after = inv ? inv.remaining - amount - discount : 0;
  const over = !!inv && after < -0.005;
  const options = useMemo(() => invoices.map((i) => ({ value: i.id, label: `${i.doc_no || '-'} — ${i.vendor}`, sub: `Sisa ${rp(i.remaining)}` })), [invoices]);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await savePurchasePayment({ invoice_id: invoiceId, doc_no: docNo, pay_date: date, amount, discount, method, reference_no: ref, notes });
      if (r.error) return toast(r.error, 'error');
      toast('Purchase Payment berhasil disimpan', 'success');
      router.push('/dashboard/purchase-payment');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell title="New Purchase Payment" icon="fi fi-rr-wallet" backHref="/dashboard/purchase-payment" saving={saving} disabled={!invoiceId || over || amount + discount <= 0} onSave={handleSave}>
      <Sec title="Informasi Payment" icon="fi fi-rr-receipt">
        <div className="fv2-grid">
          <FvField label="Purchase Invoice" required><SearchSelect value={invoiceId} onChange={setInvoiceId} options={options} placeholder="Cari invoice vendor..." /></FvField>
          <FvField label="Vendor"><input readOnly value={inv?.vendor ?? ''} placeholder="Terisi otomatis dari invoice" /></FvField>
          <FvField label="Payment ID (PP)"><input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk autogenerate" /></FvField>
          <FvField label="Tanggal Payment" required><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FvField>
          <FvField label="Metode Pembayaran"><FinanceSelect kind="payment_method" value={method} onChange={setMethod} /></FvField>
          <FvField label="No. Referensi"><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="No. transfer / cek / giro" /></FvField>
        </div>
        {invoices.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Belum ada Purchase Invoice yang memiliki sisa utang.</p>}
      </Sec>
      <Sec title="Jumlah Pembayaran" icon="fi fi-rr-coins">
        <div className="fv2-grid">
          <FvField label="Jumlah Payment" required><RupiahInput value={amount} onValue={setAmount} /></FvField>
          <FvField label="Total Discount"><RupiahInput value={discount} onValue={setDiscount} /></FvField>
        </div>
        <div style={{ marginTop: 14 }}><FvField label="Catatan"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" /></FvField></div>
      </Sec>
      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Total Invoice</span><span>{inv ? rp(inv.grand_total) : '-'}</span></div>
          <div className="dv2-summary-row"><span>Sudah Dibayar Sebelumnya</span><span>{inv ? rp(inv.total_paid + inv.paid_discount) : '-'}</span></div>
          <div className="dv2-summary-row"><span>Sisa Utang Sebelum Payment Ini</span><span>{inv ? rp(inv.remaining) : '-'}</span></div>
          <div className="dv2-summary-row charge"><span>Payment Ini</span><span>- {rp(amount)}</span></div>
          <div className="dv2-summary-row discount"><span>Total Discount</span><span>- {rp(discount)}</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: over ? '#dc2626' : '#1a237e' }}><span>Sisa Utang</span><span>{inv ? rp(after) : '-'}</span></div>
          {over && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>Jumlah payment + discount melebihi sisa utang invoice.</p>}
          {inv && !over && after <= 0.005 && amount + discount > 0 && <p style={{ fontSize: 11, color: '#16a34a', marginTop: 6 }}>Invoice akan berstatus PAID (lunas).</p>}
        </div>
      </Sec>
    </DocFormShell>
  );
}
