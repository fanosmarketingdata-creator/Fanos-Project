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
import ProjectClientFields from '@/components/registry/ProjectClientFields';
import { type ProductOption } from '@/components/ProductPicker';
import { DiscountEditor, ChargeEditor } from '@/components/DiscountChargeEditor';
import { sumDiscountPercent, sumChargeAmount, sumTaxAmount, sumTaxPercent } from '@/lib/discount-charge';
import type { DiscountLine, ChargeLine } from '@/lib/discount-charge';
import { saveQuotation, getBOQItemsForQuote, type QuotationInput, type QuoteItemInput } from './actions';

export type ClientOption = { id: string; project_name: string };
export type BOQOption = { id: string; project_name: string };

function emptyItem(): QuoteItemInput {
  return { product_id: null, sku: '', qty: 1, uom: 'Pcs', unit_price: 0, description: '' };
}

export default function QuotationForm({
  clients,
  products,
  boqProjects,
  initial,
}: {
  clients: ClientOption[];
  products: ProductOption[];
  boqProjects: BOQOption[];
  initial?: QuotationInput & { id?: string };
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingBOQ, setLoadingBOQ] = useState(false);
  const [unlisted, setUnlisted] = useState<{ sku: string; name: string }[]>([]);

  const [mode, setMode] = useState<'boq' | 'manual'>(initial?.mode ?? 'boq');
  const [quoteDate, setQuoteDate] = useState(initial?.quote_date ?? new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState(initial?.validity_date ?? '');
  const [boqProjectId, setBoqProjectId] = useState(initial?.boq_project_id ?? '');
  const [projectName, setProjectName] = useState(initial?.project_name ?? '');
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [items, setItems] = useState<QuoteItemInput[]>(initial?.items?.length ? initial.items : [emptyItem()]);
  const [discounts, setDiscounts] = useState<DiscountLine[]>(initial?.discounts ?? []);
  const [charges, setCharges] = useState<ChargeLine[]>(initial?.charges ?? []);

  async function handlePickBOQ(id: string) {
    setBoqProjectId(id);
    setUnlisted([]);
    if (!id) return;
    setLoadingBOQ(true);
    const { items: boqItems, clientId: boqClientId, unlisted: ul } = await getBOQItemsForQuote(id);
    setLoadingBOQ(false);
    setUnlisted(ul);
    setClientId(boqClientId);
    setItems(
      boqItems.map((it) => {
        const matched = products.find((p) => p.sku === it.sku);
        return {
          product_id: it.product_id,
          sku: it.sku,
          qty: Number(it.qty),
          uom: it.uom ?? '',
          unit_price: 0,
          description: matched?.name || '',
        };
      })
    );
  }

  function updateItem(i: number, patch: Partial<QuoteItemInput>) {
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
    if (mode === 'manual' && !projectName.trim()) return toast('Nama Project wajib diisi.', 'error');
    if (mode === 'boq' && unlisted.length > 0) return toast(`Ada ${unlisted.length} produk dari BOQ yang belum masuk Price List. Jadikan Price List terlebih dahulu.`, 'error');
    setSaving(true);
    const result = await saveQuotation({
      id: initial?.id,
      mode,
      quote_date: quoteDate,
      validity_date: validityDate || undefined,
      boq_project_id: mode === 'boq' ? boqProjectId : null,
      project_name: mode === 'manual' ? projectName : undefined,
      client_id: clientId,
      discounts,
      charges,
      items,
    });
    setSaving(false);

    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(initial?.id ? 'Data Quotation berhasil diperbarui' : 'Data Quotation berhasil ditambahkan', 'success');
    router.push('/dashboard/quotations');
  }

  const discountAmount = subtotal - afterDiscount;
  const chargeAmount = sumChargeAmount(charges);

  return (
    <DocFormShell
      title={initial?.id ? 'Edit Quotation' : 'New Quotation'}
      icon="fi fi-rr-file-invoice"
      backHref="/dashboard/quotations"
      saving={saving}
      saveLabel="Simpan"
      onSave={handleSave}
    >
      <Sec title="Informasi Quotation" icon="fi fi-rr-info">
        <div className="fv2-grid">
          {!initial?.id && (
            <FvField label="Sumber Data">
              <Select value={mode} onChange={(e) => setMode(e.target.value as 'boq' | 'manual')}>
                <option value="boq">Dari BOQ Project</option>
                <option value="manual">Input Manual</option>
              </Select>
            </FvField>
          )}
          <FvField label="Tanggal Quotation" required>
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
          </FvField>
          {mode === 'boq' && !initial?.id ? (
            <FvField label="BOQ Project" required>
              <SearchSelect
                value={boqProjectId}
                onChange={(v) => handlePickBOQ(v)}
                options={boqProjects.map((b) => ({ value: b.id, label: b.project_name }))}
                placeholder="Cari BOQ Project..."
              />
            </FvField>
          ) : (
            <ProjectClientFields projectName={projectName} clientId={clientId} onProjectName={setProjectName} onClientId={setClientId} fallbackClients={clients} hideProject={mode === 'boq'} />
          )}
          <FvField label="Berlaku Sampai">
            <input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
          </FvField>
        </div>
        {mode === 'boq' && !initial?.id && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Client otomatis mengikuti Client yang tercatat pada BOQ Project.</p>
        )}
      </Sec>

      <Sec title="Daftar Item" icon="fi fi-rr-list">
        {mode === 'boq' && unlisted.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 12, padding: '12px 14px', marginBottom: 12, fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}><i className="fi fi-rr-exclamation" /> Produk berikut belum masuk Price List</div>
            <div style={{ marginBottom: 6 }}>Jadikan Price List terlebih dahulu (menu Price List, atur harga produknya), lalu pilih ulang BOQ ini.</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {unlisted.map((u) => <li key={u.sku}><b>{u.sku}</b> — {u.name}</li>)}
            </ul>
            <a href="/dashboard/products/price-list" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontWeight: 700, color: '#b45309', textDecoration: 'underline' }}>Buka Price List</a>
          </div>
        )}
        {loadingBOQ && <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Memuat item dari BOQ Project...</p>}
        <div className="fv2-scroll-x">
          <div style={{ minWidth: 700 }}>
            <div className="fv2-item-head">
              <span style={{ flex: 2 }}>Produk (SKU)</span>
              <span style={{ width: 70 }}>Qty</span>
              <span style={{ width: 70 }}>UOM</span>
              <span style={{ flex: 1 }}>Harga Satuan</span>
              <span style={{ flex: 1 }}>Subtotal</span>
              <span style={{ width: 30 }} />
            </div>
            {items.map((it, i) => (
              <div key={i} className="fv2-item-row">
                <div style={{ flex: 2 }}>
                  <ProductPickButton products={products} value={it.sku} onSelect={(p) => updateItem(i, { product_id: p.id, sku: p.sku, uom: p.uom, unit_price: Number(p.price) || 0 })} />
                </div>
                <input type="number" style={{ width: 70, flex: 'none' }} value={it.qty} onChange={(e) => updateItem(i, { qty: parseFloat(e.target.value) || 0 })} />
                <input style={{ width: 70, flex: 'none' }} value={it.uom} onChange={(e) => updateItem(i, { uom: e.target.value })} />
                <RupiahInput style={{ flex: 1 }} value={it.unit_price} onValue={(n) => updateItem(i, { unit_price: n })} />
                <input style={{ flex: 1 }} readOnly value={`Rp ${(it.qty * it.unit_price).toLocaleString('id-ID')}`} />
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
          <TotalsBox subtotal={subtotal} discountPercent={discountPercent} discountAmount={discountAmount} taxPercent={taxPercent} taxAmount={taxAmount} chargeAmount={chargeAmount} total={total} discounts={discounts} charges={charges} />
        </div>
      </div>
    </DocFormShell>
  );
}
