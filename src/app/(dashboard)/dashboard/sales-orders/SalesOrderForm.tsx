'use client';

import RupiahInput from '@/components/ui/RupiahInput';
import Select from '@/components/ui/Select';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { ProductPickButton } from '@/components/registry/ProductPickerModal';
import DocFormShell, { Sec, TotalsBox } from '@/components/registry/DocFormShell';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { type ProductOption } from '@/components/ProductPicker';
import { DiscountEditor, ChargeEditor } from '@/components/DiscountChargeEditor';
import { sumDiscountPercent, sumChargeAmount, sumTaxAmount, sumTaxPercent } from '@/lib/discount-charge';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import type { QuoteOption } from '@/lib/so-quotes';
import { saveSalesOrder, getQuotationForSO, type SalesOrderInput, type SOItemInput } from './actions';

export type ClientOption = { id: string; project_name: string };

function emptyItem(): SOItemInput {
  return { product_id: null, sku: '', qty: 1, unit_price: 0, notes: '' };
}

export default function SalesOrderForm({
  clients,
  products,
  quotations,
  initial,
}: {
  clients: ClientOption[];
  products: ProductOption[];
  quotations: QuoteOption[];
  initial?: SalesOrderInput & { id?: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const [mode, setMode] = useState<'quotation' | 'manual'>(initial?.mode ?? 'quotation');
  const [soDate, setSoDate] = useState(initial?.so_date ?? new Date().toISOString().split('T')[0]);
  const [quotationId, setQuotationId] = useState(initial?.quotation_id ?? '');
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [globalNotes, setGlobalNotes] = useState(initial?.global_notes ?? '');
  const [items, setItems] = useState<SOItemInput[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [discounts, setDiscounts] = useState<DiscountLine[]>(initial?.discounts ?? []);
  const [charges, setCharges] = useState<ChargeLine[]>(initial?.charges ?? []);

  async function handlePickQuotation(id: string) {
    setQuotationId(id);
    if (!id) return;
    setLoadingQuote(true);
    try {
      const r = await getQuotationForSO(id);
      if ('error' in r) return toast(r.error ?? 'Quotation tidak ditemukan', 'error');
      setClientId(r.clientId);
      setItems(r.items.length ? r.items.map((it) => ({ ...it, notes: '' })) : [emptyItem()]);
      setDiscounts(r.discounts);
      setCharges(r.charges);
    } catch (e) {
      toast('Quotation gagal dimuat: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setLoadingQuote(false);
    }
  }

  function updateItem(i: number, patch: Partial<SOItemInput>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, j) => j !== i));
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const discountPercent = sumDiscountPercent(discounts);
  const afterDiscount = subtotal * (1 - discountPercent / 100);
  const taxAmount = sumTaxAmount(subtotal, discounts);
  const taxPercent = sumTaxPercent(discounts);
  const total = afterDiscount + taxAmount + sumChargeAmount(charges);

  async function handleSave() {
    setSaving(true);
    const result = await saveSalesOrder({
      id: initial?.id,
      mode,
      so_date: soDate,
      quotation_id: mode === 'quotation' ? quotationId : null,
      client_id: clientId,
      discounts,
      charges,
      global_notes: globalNotes,
      items,
    });
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(initial?.id ? 'Data Sales Order berhasil diperbarui' : 'Data Sales Order berhasil ditambahkan', 'success');
    router.push('/dashboard/sales-orders');
  }

  const discountAmount = subtotal - afterDiscount;
  const chargeAmount = sumChargeAmount(charges);

  return (
    <DocFormShell
      title={initial?.id ? 'Edit Sales Order' : 'New Sales Order'}
      icon="fi fi-rr-shopping-cart"
      backHref="/dashboard/sales-orders"
      saving={saving}
      saveLabel="Simpan"
      onSave={handleSave}
    >
      <Sec title="Informasi Sales Order" icon="fi fi-rr-info">
        <div className="fv2-grid">
          {!initial?.id && (
            <FvField label="Sumber Data">
              <Select value={mode} onChange={(e) => setMode(e.target.value as 'quotation' | 'manual')}>
                <option value="quotation">Dari Quotation</option>
                <option value="manual">Input Manual</option>
              </Select>
            </FvField>
          )}
          <FvField label="Tanggal Sales Order" required>
            <input type="date" value={soDate} onChange={(e) => setSoDate(e.target.value)} />
          </FvField>
          {mode === 'quotation' && !initial?.id && (
            <FvField label="Quotation" required>
              <SearchSelect
                value={quotationId}
                onChange={(v) => handlePickQuotation(v)}
                options={quotations.map((q) => ({
                  value: q.id,
                  label: `${q.doc_no} — ${q.client_name}`,
                  sub: `${q.status} · Rp ${q.total_amount.toLocaleString('id-ID')}`,
                }))}
                placeholder="Cari quotation..."
              />
            </FvField>
          )}
          <FvField label="Client" required>
            {mode === 'quotation' ? (
              <input readOnly value={clients.find((c) => c.id === clientId)?.project_name ?? ''} placeholder="Terisi otomatis dari quotation" />
            ) : (
              <SearchSelect
                value={clientId}
                onChange={(v) => setClientId(v)}
                options={clients.map((c) => ({ value: c.id, label: c.project_name }))}
                placeholder="Cari client..."
              />
            )}
          </FvField>
          <FvField label="Catatan Umum">
            <input value={globalNotes} onChange={(e) => setGlobalNotes(e.target.value)} placeholder="Catatan untuk seluruh pesanan" />
          </FvField>
        </div>
      </Sec>

      <Sec title="Daftar Item" icon="fi fi-rr-list">
        {loadingQuote && <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Memuat item dari Quotation...</p>}
        <div className="fv2-scroll-x">
          <div style={{ minWidth: 700 }}>
            <div className="fv2-item-head">
              <span style={{ flex: 2 }}>Produk (SKU)</span>
              <span style={{ width: 70 }}>Qty</span>
              <span style={{ flex: 1 }}>Harga Satuan</span>
              <span style={{ flex: 1 }}>Subtotal</span>
              <span style={{ flex: 1 }}>Catatan</span>
              <span style={{ width: 30 }} />
            </div>
            {items.map((it, i) => (
              <div key={i} className="fv2-item-row">
                <div style={{ flex: 2 }}>
                  <ProductPickButton products={products} value={it.sku} onSelect={(p) => updateItem(i, { product_id: p.id, sku: p.sku, unit_price: Number(p.price) || 0 })} />
                </div>
                <input type="number" style={{ width: 70, flex: 'none' }} value={it.qty} onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                <RupiahInput style={{ flex: 1 }} value={it.unit_price} onValue={(n) => updateItem(i, { unit_price: n })} />
                <input style={{ flex: 1 }} readOnly value={`Rp ${(it.qty * it.unit_price).toLocaleString('id-ID')}`} />
                <input style={{ flex: 1 }} value={it.notes} onChange={(e) => updateItem(i, { notes: e.target.value })} />
                <button type="button" className="fv2-del-btn" aria-label="Hapus item" onClick={() => removeItem(i)}>
                  <i className="fi fi-rr-cross-small" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {mode === 'manual' && (
          <button type="button" className="fv2-add-btn" onClick={addItem}>
            <i className="fi fi-rr-plus" /> Tambah Item
          </button>
        )}
      </Sec>

      <div className="fv2-grid">
        <div>
          <DiscountEditor lines={discounts} onChange={setDiscounts} />
          <div style={{ height: 14 }} />
          <ChargeEditor lines={charges} onChange={setCharges} />
        </div>
        <div>
          <div className="fv2-section-title"><i className="fi fi-rr-calculator" /> Ringkasan</div>
          <TotalsBox subtotal={subtotal} discountPercent={discountPercent} discountAmount={discountAmount} taxPercent={taxPercent} taxAmount={taxAmount} chargeAmount={chargeAmount} total={total} />
        </div>
      </div>
    </DocFormShell>
  );
}
