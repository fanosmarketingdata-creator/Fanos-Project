'use client';

import RupiahInput from '@/components/ui/RupiahInput';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DetailModal, DeleteModal, DvCard, FvField } from '@/components/registry/RegistryModal';
import { SPEC_GROUPS, type SpecKey } from '../fields';
import { savePrices, removeFromPriceList } from '../actions';

export type PriceRow = {
  id: string; sku: string | null; name: string; brand: string | null; uom: string;
  price: number; cost_price: number | null; price_listed: boolean; image_url: string | null;
  category: string | null; subcategory: string | null; application: string | null; notes: string | null;
} & Record<SpecKey, string | null>;

const rupiah = (n: number | null) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const Thumb = ({ url, alt }: { url: string | null; alt: string }) =>
  url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} loading="lazy" />
  ) : (
    <i className="fa-solid fa-image no-image" />
  );

export default function PriceListTable({ initialRows }: { initialRows: PriceRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<PriceRow | null>(null);
  // Form harga: target = produk yang diatur harganya; baru = pilih dari Catalogue dulu.
  const [priceForm, setPriceForm] = useState<{ target: PriceRow | null; isNew: boolean } | null>(null);
  const [pickSearch, setPickSearch] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<PriceRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const listed = useMemo(() => initialRows.filter((r) => r.price_listed), [initialRows]);
  const unlisted = useMemo(() => initialRows.filter((r) => !r.price_listed), [initialRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? listed.filter((r) => [r.sku, r.name, r.brand, r.category, r.subcategory].some((v) => (v || '').toLowerCase().includes(q))) : listed;
  }, [listed, search]);
  const paged = usePaged(filtered, search, 24);

  const pickable = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    return q ? unlisted.filter((r) => [r.sku, r.name, r.category].some((v) => (v || '').toLowerCase().includes(q))) : unlisted;
  }, [unlisted, pickSearch]);

  function openNew() {
    setPriceForm({ target: null, isNew: true });
    setPickSearch('');
    setCost('');
    setPrice('');
  }
  function openEdit(r: PriceRow) {
    setPriceForm({ target: r, isNew: false });
    setCost(String(Number(r.cost_price) || 0));
    setPrice(String(Number(r.price) || 0));
  }

  async function handleSave() {
    if (!priceForm?.target) return toast('Pilih produk dari Catalogue terlebih dahulu.', 'error');
    setSaving(true);
    try {
      const r = await savePrices(priceForm.target.id, parseFloat(cost) || 0, parseFloat(price) || 0);
      if (r.error) return toast(r.error, 'error');
      toast(priceForm.isNew ? 'Price List berhasil ditambahkan' : 'Harga berhasil diperbarui', 'success');
      setPriceForm(null);
      setDetail(null);
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const r = await removeFromPriceList(removeTarget.id);
      if (r.error) return toast(r.error, 'error');
      toast('Produk dikeluarkan dari Price List', 'success');
      setRemoveTarget(null);
      setDetail(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setRemoving(false);
    }
  }

  const target = priceForm?.target ?? null;

  return (
    <RegistryCard
      title="Price List"
      icon="fi fi-rr-usd-circle"
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel="New Price List"
      addIcon="fi fi-rr-plus"
      onAdd={openNew}
      footer={<Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} />}
    >
      <div className="product-grid-wrap">
        <div className="product-grid">
          {paged.pageItems.length === 0 && <div className="no-data-grid">Belum terdapat data price list</div>}
          {paged.pageItems.map((p) => (
            <div key={p.id} className="product-card">
              <div className="product-card-image" onClick={() => setDetail(p)}><Thumb url={p.image_url} alt={p.sku ?? ''} /></div>
              <div className="product-card-body" onClick={() => setDetail(p)}>
                <div className="product-card-brand">{p.name}</div>
                <div className="product-card-price">
                  <span className="selling">{rupiah(p.price)}</span>
                  <span className="uom">{p.uom || 'Pcs'}</span>
                </div>
              </div>
              <div className="product-card-actions">
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => openEdit(p)} title="Edit harga"><i className="fi fi-rr-pencil" /></button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setRemoveTarget(p)} title="Keluarkan dari Price List"><i className="fi fi-rr-trash" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <DetailModal title="Price List Detail" onClose={() => setDetail(null)}>
          <div className="dv2">
            <div className="dv2-product-layout">
              <div className="dv2-product-info">
                <div className="dv2-topbar-id">{detail.sku}</div>
                <div className="dv2-topbar-title" style={{ marginBottom: 10 }}>{detail.name}</div>
                <div className="dv2-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <DvCard icon="fi fi-rr-money-bill" label="Cost Price" value={rupiah(detail.cost_price)} />
                  <DvCard icon="fi fi-rr-money-bill" label="Standard Selling Price" value={rupiah(detail.price)} color="#16a34a" />
                </div>
              </div>
              <div className="dv2-product-image-box"><Thumb url={detail.image_url} alt={detail.sku || ''} /></div>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-award" label="Brand" value={detail.brand || '-'} />
              <DvCard icon="fi fi-rr-apps" label="Main Category" value={detail.category || '-'} />
              <DvCard icon="fi fi-rr-apps-add" label="Subcategory" value={detail.subcategory || '-'} />
              <DvCard icon="fi fi-rr-box" label="UOM" value={detail.uom || 'Pcs'} />
              <DvCard icon="fi fi-rr-building" label="Application" value={detail.application || '-'} />
            </div>
            {SPEC_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="dv2-section-title"><i className={g.icon} /> {g.title}</div>
                <div className="dv2-grid">
                  {g.fields.map((f) => <DvCard key={f.key} icon={f.icon} label={f.label} value={detail[f.key] || '-'} />)}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-primary" onClick={() => openEdit(detail)}><i className="fi fi-rr-pencil" /> Edit Harga</button>
            </div>
          </div>
        </DetailModal>
      )}

      {priceForm && (
        <FormModal
          title={priceForm.isNew ? 'New Price List' : 'Edit Harga'}
          icon="fi fi-rr-usd-circle"
          maxWidth={560}
          onClose={() => setPriceForm(null)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !target}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setPriceForm(null)}>Batal</button>
            </>
          }
        >
          {priceForm.isNew && (
            <div className="fv2-section">
              <div className="fv2-section-title"><i className="fi fi-rr-box" /> Pilih Produk dari Catalogue</div>
              <div className="search-box" style={{ marginBottom: 10 }}>
                <span className="search-icon"><i className="fa-solid fa-search" /></span>
                <input type="text" placeholder="Cari produk..." value={pickSearch} onChange={(e) => setPickSearch(e.target.value)} />
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 6 }}>
                {pickable.length === 0 && (
                  <div className="no-data-grid">{unlisted.length === 0 ? 'Semua produk Catalogue sudah memiliki price list' : 'Produk tidak ditemukan'}</div>
                )}
                {pickable.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPriceForm({ target: r, isNew: true })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
                      border: `1.5px solid ${target?.id === r.id ? '#2563eb' : '#e5e7eb'}`, background: target?.id === r.id ? '#eff6ff' : '#fff',
                    }}
                  >
                    <span style={{ width: 36, height: 36, flex: 'none', borderRadius: 6, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Thumb url={r.image_url} alt="" />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{r.name}</b>
                      <span style={{ display: 'block', color: '#6b7280', fontSize: 11 }}>{r.sku} · {[r.category, r.subcategory].filter(Boolean).join(' · ') || '-'}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {!priceForm.isNew && target && (
            <div style={{ fontSize: 13, marginBottom: 12 }}><b>{target.name}</b> <span style={{ color: '#6b7280' }}>· {target.sku}</span></div>
          )}
          {target && (
            <div className="fv2-section">
              <div className="fv2-section-title"><i className="fi fi-rr-money-bill" /> Harga</div>
              <div className="fv2-grid">
                <FvField label="Cost Price (Rp)">
                  <RupiahInput value={cost} onValue={(n) => setCost(String(n))} />
                </FvField>
                <FvField label="Standard Selling Price (Rp)">
                  <RupiahInput value={price} onValue={(n) => setPrice(String(n))} />
                </FvField>
              </div>
            </div>
          )}
        </FormModal>
      )}

      {removeTarget && (
        <DeleteModal title="Keluarkan dari Price List" itemName={removeTarget.name} busy={removing} onConfirm={handleRemove} onClose={() => setRemoveTarget(null)} />
      )}
    </RegistryCard>
  );
}
