'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import DocFormShell, { Sec } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import SOEditPanel from '@/components/registry/SOEditPanel';
import { FvField } from '@/components/registry/RegistryModal';
import type { ProductOption } from '@/components/ProductPicker';
import type { SOEdits } from '@/lib/so-types';
import { getSalesOrderFull } from '../../sales-orders/actions';
import { createInvoiceFromSO } from '../actions';

export type UninvoicedSO = { id: string; doc_no: string | null; so_date: string; total_amount: number; client_name: string };

export default function NewInvoiceForm({ salesOrders, products }: { salesOrders: UninvoicedSO[]; products: ProductOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [soId, setSoId] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNo, setDocNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [edits, setEdits] = useState<SOEdits | null>(null);
  const [original, setOriginal] = useState('');

  async function pickSO(id: string) {
    setSoId(id);
    setEdits(null);
    setClientName('');
    if (!id) return;
    setLoading(true);
    try {
      const so = await getSalesOrderFull(id);
      if (!so) return toast('Sales Order tidak ditemukan', 'error');
      const e: SOEdits = { items: so.items, discounts: so.discounts, charges: so.charges };
      setEdits(e);
      setOriginal(JSON.stringify(e));
      setClientName(so.client_name);
    } catch (err) {
      toast('Sales Order gagal dimuat: ' + (err instanceof Error ? err.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!soId) {
      toast('Mohon pilih Sales Order terlebih dahulu.', 'error');
      return;
    }
    setSaving(true);
    let result: Awaited<ReturnType<typeof createInvoiceFromSO>>;
    try {
      const changed = edits && JSON.stringify(edits) !== original;
      result = await createInvoiceFromSO({ so_id: soId, inv_date: invDate, doc_no: docNo, edits: changed ? edits : undefined });
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
      return;
    } finally {
      setSaving(false);
    }

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
      saving={saving}
      disabled={!soId || !edits}
      saveLabel="Buat Invoice"
      onSave={handleSave}
    >
      <Sec title="Informasi Invoice" icon="fi fi-rr-info">
        <div className="fv2-grid">
          <FvField label="Invoice ID">
            <input value={docNo} onChange={(e) => setDocNo(e.target.value)} placeholder="Kosongkan untuk otomatis (INV-...)" />
          </FvField>
          <FvField label="Sales Order" required>
            <SearchSelect
              value={soId}
              onChange={(v) => pickSO(v)}
              options={salesOrders.map((so) => ({
                value: so.id,
                label: `${so.doc_no || 'SO'} — ${so.client_name}`,
                sub: `${new Date(so.so_date).toLocaleDateString('id-ID')} — Rp ${so.total_amount.toLocaleString('id-ID')}`,
              }))}
              placeholder="Pilih Sales Order yang belum ditagihkan"
            />
          </FvField>
          <FvField label="Client">
            <input readOnly value={clientName} placeholder="Terisi otomatis dari Sales Order" />
          </FvField>
          <FvField label="Tanggal Invoice" required>
            <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
          </FvField>
        </div>
        {salesOrders.length === 0 && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
            Seluruh Sales Order telah memiliki invoice, atau belum terdapat Sales Order yang sudah VERIFIED.
          </p>
        )}
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Data ditarik dari Sales Order yang dipilih dan dapat diedit. Perubahan juga disimpan ke Sales Order tersebut.
        </p>
      </Sec>

      {loading && <div className="dv2-loading"><div className="spinner" />Memuat data Sales Order...</div>}
      {edits && <SOEditPanel value={edits} onChange={setEdits} products={products} />}
    </DocFormShell>
  );
}
