'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import FinanceSelect from '@/components/registry/FinanceSelect';
import { FvField } from '@/components/registry/RegistryModal';
import RupiahInput from '@/components/ui/RupiahInput';
import { savePayment } from './actions';

export type PayableInvoice = {
  id: string; doc_no: string | null; inv_date: string; client_name: string;
  grand_total: number; total_paid: number; paid_discount: number; credit_applied: number; remaining: number;
};
export type PaymentInitial = {
  id: string; invoice_id: string; doc_no: string | null; pay_date: string; amount: number; discount: number;
  method: string | null; reference_no: string | null; notes: string | null;
};

const rp = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export default function PaymentForm({ invoices, initial, presetInvoice }: { invoices: PayableInvoice[]; initial?: PaymentInitial; presetInvoice?: string }) {
  const router = useRouter();
  const toast = useToast();
  const today = new Date().toISOString().split('T')[0];
  const [invoiceId, setInvoiceId] = useState(initial?.invoice_id ?? (invoices.some((i) => i.id === presetInvoice) ? presetInvoice! : ''));
  const [docNo, setDocNo] = useState(initial?.doc_no ?? '');
  const [payDate, setPayDate] = useState(initial?.pay_date ?? today);
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [method, setMethod] = useState(initial?.method ?? '');
  const [referenceNo, setReferenceNo] = useState(initial?.reference_no ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const inv = invoices.find((i) => i.id === invoiceId);
  // Owing sebelum payment ini (saat edit, payment ini tidak dihitung dua kali).
  const owingBefore = inv ? inv.remaining + (initial && initial.invoice_id === inv.id ? initial.amount + initial.discount : 0) : 0;
  const paidBefore = inv ? inv.total_paid + inv.paid_discount + inv.credit_applied - (initial && initial.invoice_id === inv.id ? initial.amount + initial.discount : 0) : 0;
  const owingAfter = owingBefore - amount - discount;
  const over = !!inv && owingAfter < -0.005;

  const options = useMemo(
    () => invoices.map((i) => ({ value: i.id, label: `${i.doc_no || '-'} — ${i.client_name}`, sub: `Sisa ${rp(i.remaining)}` })),
    [invoices]
  );

  async function handleSave() {
    setSaving(true);
    try {
      const r = await savePayment({ id: initial?.id, invoice_id: invoiceId, doc_no: docNo, pay_date: payDate, amount, discount, method, reference_no: referenceNo, notes });
      if (r.error) return toast(r.error, 'error');
      toast(initial ? 'Payment berhasil diperbarui' : 'Payment berhasil disimpan', 'success');
      router.push('/dashboard/payments');
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DocFormShell
      title={initial ? 'Edit Payment' : 'New Payment'}
      icon="fi fi-rr-money-bill-wave"
      backHref="/dashboard/payments"
      saving={saving}
      disabled={!invoiceId || over || amount + discount <= 0}
      onSave={handleSave}
    >
      <Sec title="Informasi Payment" icon="fi fi-rr-receipt">
        <div className="fv2-grid">
          <FvField label="Invoice" required>
            <SearchSelect value={invoiceId} onChange={(v) => setInvoiceId(v)} options={options} placeholder="Cari invoice..." disabled={!!initial} />
          </FvField>
          <FvField label="Client">
            <input readOnly value={inv?.client_name ?? ''} placeholder="Terisi otomatis dari invoice" />
          </FvField>
          <FvField label="Payment ID (CR)">
            <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk autogenerate" />
          </FvField>
          <FvField label="Tanggal Payment" required>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </FvField>
          <FvField label="Metode Pembayaran">
            <FinanceSelect kind="payment_method" value={method} onChange={setMethod} />
          </FvField>
          <FvField label="No. Referensi">
            <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="No. transfer / cek / giro" />
          </FvField>
        </div>
        {invoices.length === 0 && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Belum ada invoice yang memiliki sisa tagihan.</p>
        )}
      </Sec>

      <Sec title="Jumlah Pembayaran" icon="fi fi-rr-coins">
        <div className="fv2-grid">
          <FvField label="Jumlah Payment" required>
            <RupiahInput value={amount} onValue={setAmount} />
          </FvField>
          <FvField label="Total Discount">
            <RupiahInput value={discount} onValue={setDiscount} />
          </FvField>
        </div>
        <div style={{ marginTop: 14 }}>
          <FvField label="Catatan">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan (opsional)" />
          </FvField>
        </div>
      </Sec>

      <Sec title="Summary" icon="fi fi-rr-calculator">
        <div className="fv2-summary">
          <div className="dv2-summary-row"><span>Total Invoice</span><span>{inv ? rp(inv.grand_total) : '-'}</span></div>
          <div className="dv2-summary-row"><span>Sudah Dibayar / Dikreditkan Sebelumnya</span><span>{inv ? rp(paidBefore) : '-'}</span></div>
          <div className="dv2-summary-row"><span>Owing Sebelum Payment Ini</span><span>{inv ? rp(owingBefore) : '-'}</span></div>
          <div className="dv2-summary-row charge"><span>Payment Ini</span><span>- {rp(amount)}</span></div>
          <div className="dv2-summary-row discount"><span>Total Discount</span><span>- {rp(discount)}</span></div>
          <div className="dv2-summary-row" style={{ borderTop: '1.5px solid #e5e7eb', marginTop: 6, paddingTop: 10, fontSize: 15, fontWeight: 800, color: over ? '#dc2626' : '#1a237e' }}>
            <span>Owing (Sisa Tagihan)</span>
            <span>{inv ? rp(owingAfter) : '-'}</span>
          </div>
          {over && <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>Jumlah payment + discount melebihi sisa tagihan invoice.</p>}
          {inv && !over && owingAfter <= 0.005 && <p style={{ fontSize: 11, color: '#16a34a', marginTop: 6 }}>Invoice akan berstatus PAID (lunas).</p>}
        </div>
      </Sec>
    </DocFormShell>
  );
}
