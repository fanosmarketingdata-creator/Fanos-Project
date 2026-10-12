'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
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
      toast('Pilih Sales Order terlebih dahulu', 'error');
      return;
    }
    setSaving(true);
    const result = await createInvoiceFromSO({ so_id: soId, inv_date: invDate });
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Invoice berhasil dibuat', 'success');
    router.push(`/dashboard/invoices/${result.id}`);
  }

  return (
    <div className="max-w-lg rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <label className="mb-1 block text-xs font-semibold text-slate-500">Sales Order *</label>
        <select
          value={soId}
          onChange={(e) => setSoId(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">-- Pilih Sales Order yang belum di-invoice --</option>
          {salesOrders.map((so) => (
            <option key={so.id} value={so.id}>
              {so.client_name} — {new Date(so.so_date).toLocaleDateString('id-ID')} — Rp {so.total_amount.toLocaleString('id-ID')}
            </option>
          ))}
        </select>
        {salesOrders.length === 0 && (
          <p className="mt-1.5 text-[11px] text-slate-400">Semua Sales Order sudah punya invoice, atau belum ada SO berjalan.</p>
        )}
      </div>

      <div className="mb-5">
        <label className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Invoice *</label>
        <input
          type="date"
          value={invDate}
          onChange={(e) => setInvDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => router.push('/dashboard/invoices')}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !soId}
          className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? 'Memproses...' : 'Buat Invoice'}
        </button>
      </div>
    </div>
  );
}
