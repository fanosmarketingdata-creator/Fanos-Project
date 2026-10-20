'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { createInvoiceFromSO } from '../actions';

export type UninvoicedSO = { id: string; so_date: string; total_amount: number; client_name: string };

export default function NewInvoiceForm({ salesOrders }: { salesOrders: UninvoicedSO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [soId, setSoId] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!soId) {
      toast('Mohon pilih Sales Order terlebih dahulu.', 'error');
      return;
    }
    setSaving(true);
    const result = await createInvoiceFromSO({ so_id: soId, inv_date: invDate });
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Data Invoice berhasil dibuat', 'success');
    router.push(`/dashboard/invoices/${result.id}`);
  }

  return (
    <DocFormShell
      title="New Invoice"
      icon="fi fi-rr-receipt"
      backHref="/dashboard/invoices"
      saving={saving || !soId}
      saveLabel="Buat Invoice"
      onSave={handleSave}
    >
      <Sec title="Informasi Invoice" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Sales Order" required>
            <SearchSelect
              value={soId}
              onChange={(v) => setSoId(v)}
              options={salesOrders.map((so) => ({
                value: so.id,
                label: so.client_name,
                sub: `${new Date(so.so_date).toLocaleDateString('id-ID')} — Rp ${so.total_amount.toLocaleString('id-ID')}`,
              }))}
              placeholder="Pilih Sales Order yang belum ditagihkan"
            />
          </FvField>
          <FvField label="Tanggal Invoice" required>
            <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
          </FvField>
        </div>
        {salesOrders.length === 0 && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
            Seluruh Sales Order telah memiliki invoice, atau belum terdapat Sales Order yang sedang berjalan.
          </p>
        )}
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Item dan harga ditarik otomatis dari Sales Order yang dipilih.</p>
      </Sec>
    </DocFormShell>
  );
}
