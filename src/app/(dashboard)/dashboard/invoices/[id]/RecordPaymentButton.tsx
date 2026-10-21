'use client';

import Select from '@/components/ui/Select';
import { useState } from 'react';
import { FormModal, FvField } from '@/components/registry/RegistryModal';
import { useToast } from '@/components/Toast';
import { recordPayment } from '../actions';

export default function RecordPaymentButton({ invoiceId }: { invoiceId: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const result = await recordPayment(invoiceId, payDate, amount, method, referenceNo, notes);
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Pembayaran berhasil dicatat', 'success');
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button type="button" className="fv2-add-btn" style={{ marginTop: 0 }} onClick={() => setOpen(true)}>
        <i className="fi fi-rr-plus" /> Catat Pembayaran
      </button>

      {open && (
        <FormModal
          title="Catat Pembayaran"
          icon="fi fi-rr-wallet"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                <i className="fi fi-rr-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-grid">
              <FvField label="Tanggal"><input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></FvField>
              <FvField label="Jumlah" required><input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} /></FvField>
              <FvField label="Metode">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>Cash</option>
                  <option>Transfer</option>
                  <option>Cek/Giro</option>
                </Select>
              </FvField>
              <FvField label="No. Referensi"><input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} /></FvField>
              <FvField label="Catatan"><input value={notes} onChange={(e) => setNotes(e.target.value)} /></FvField>
            </div>
          </div>
        </FormModal>
      )}
    </>
  );
}
