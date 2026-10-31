'use client';

import { useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DetailModal, DeleteModal, DvCard, FvField } from '@/components/registry/RegistryModal';
import BrandSelect from '@/components/registry/BrandSelect';
import FvSelect, { toOptions } from '@/components/registry/FvSelect';
import { PRODUCT_APPLICATION_OPTIONS, PRODUCT_CATEGORIES, UOM_OPTIONS } from '@/lib/master-options';
import { SPEC_GROUPS, SPEC_KEYS, PACK_NUM_KEYS, type SpecKey, type PackNumKey } from './fields';
import { PACKAGE_TYPES } from '@/lib/packing';
import { saveProduct, deleteProduct, type ProductInput } from './actions';

export type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
  brand: string | null;
  uom: string;
  price: number;
  cost_price: number | null;
  image_url: string | null;
  category: string | null;
  subcategory: string | null;
  application: string | null;
  notes: string | null;
  package_type: string | null;
} & Record<SpecKey, string | null> & Record<PackNumKey, number | null>;

const emptyPack = { package_type: 'Carton', ...Object.fromEntries(PACK_NUM_KEYS.map((k) => [k, 0])) } as { package_type: string } & Record<PackNumKey, number>;
const emptySpecs = Object.fromEntries(SPEC_KEYS.map((k) => [k, ''])) as Record<SpecKey, string>;
const emptyForm: ProductInput = {
  name: '', brand: 'FANOS', image_url: '', category: '', subcategory: '', application: '', uom: 'Pcs',
  notes: '', ...emptySpecs, ...emptyPack,
};
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB — kriteria sama seperti sistem lama
const rupiah = (n: number | null) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

export default function ProductsTable({ initialProducts, brands }: { initialProducts: ProductRow[]; brands: string[] }) {
  const [brandList, setBrandList] = useState<string[]>(brands);
  const toast = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [skuView, setSkuView] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Urut kategori lalu SKU.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? initialProducts.filter((p) =>
          [p.sku, p.name, p.category, p.subcategory, p.application, p.wattage, p.cct, p.ip_rating].some((v) =>
            (v || '').toLowerCase().includes(q)
          )
        )
      : initialProducts;
    return rows.slice().sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.sku || '').localeCompare(b.sku || ''));
  }, [initialProducts, search]);

  const paged = usePaged(filtered, search, 24);

  function openAdd() {
    setForm(emptyForm);
    setSkuView('');
    setModalOpen(true);
  }

  function openEdit(p: ProductRow) {
    const specs = Object.fromEntries(SPEC_KEYS.map((k) => [k, p[k] || ''])) as Record<SpecKey, string>;
    setForm({
      id: p.id,
      name: p.name,
      brand: p.brand || 'FANOS',
      image_url: p.image_url || '',
      category: p.category || '',
      subcategory: p.subcategory || '',
      application: p.application || '',
      uom: p.uom,
      notes: p.notes || '',
      package_type: p.package_type || 'Carton',
      ...(Object.fromEntries(PACK_NUM_KEYS.map((k) => [k, Number(p[k]) || 0])) as Record<PackNumKey, number>),
      ...specs,
    });
    setSkuView(p.sku || '');
    setModalOpen(true);
  }

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast('Format berkas tidak didukung. Gunakan format JPG, PNG, atau WebP.', 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast('Ukuran berkas melebihi batas maksimum 2 MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) {
        toast('Unggah berkas gagal: ' + uploadError.message, 'error');
        return;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast('Foto produk berhasil diunggah', 'success');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveProduct(form);
      if (result.error) return toast(result.error, 'error');
      toast(form.id ? 'Data Produk berhasil diperbarui' : 'Data Produk berhasil ditambahkan', 'success');
      setModalOpen(false);
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteProduct(deleteTarget.id);
      if (result.error) return toast(result.error, 'error');
      toast('Data Produk berhasil dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard
      title="Product Catalog"
      icon="fa-solid fa-boxes-stacked"
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel="New Product"
      addIcon="fa-solid fa-box-open"
      onAdd={openAdd}
      footer={
        <Pagination
          total={paged.total}
          page={paged.page}
          totalPages={paged.totalPages}
          rowsPerPage={paged.rowsPerPage}
          onPage={paged.setPage}
          onRows={paged.setRowsPerPage}
        />
      }
    >
      <div className="product-grid-wrap">
        <div className="product-grid">
          {paged.pageItems.length === 0 && <div className="no-data-grid">Belum terdapat data produk</div>}
          {paged.pageItems.map((p) => (
            <div key={p.id} className="product-card">
              <div className="product-card-image" onClick={() => setDetail(p)}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.sku ?? ""} loading="lazy" />
                ) : (
                  <i className="fa-solid fa-image no-image" />
                )}
              </div>
              <div className="product-card-body" onClick={() => setDetail(p)}>
                <span className="product-card-sku">{p.sku}</span>
                <div className="product-card-brand">{p.name}</div>
                <div className="product-card-type">{[p.category, p.subcategory].filter(Boolean).join(' · ') || '-'}</div>
                <div className="product-card-spec">
                  {[p.wattage && `${p.wattage}W`, p.cct && `${p.cct}K`, p.ip_rating].filter(Boolean).join(' · ') || ' '}
                </div>
                <div className="product-card-price">
                  <span className="uom">{[p.brand, p.uom || 'Pcs'].filter(Boolean).join(' · ')}</span>
                </div>
              </div>
              <div className="product-card-actions">
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => openEdit(p)} title="Edit">
                  <i className="fi fi-rr-pencil" />
                </button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setDeleteTarget(p)} title="Hapus">
                  <i className="fi fi-rr-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <DetailModal title="Product Detail" onClose={() => setDetail(null)}>
          <div className="dv2">
            <div className="dv2-product-layout">
              <div className="dv2-product-info">
                <div className="dv2-topbar-id">{detail.sku}</div>
                <div className="dv2-topbar-title" style={{ marginBottom: 10 }}>{detail.name}</div>
                <div className="dv2-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <DvCard icon="fi fi-rr-apps" label="Main Category" value={detail.category || '-'} />
                  <DvCard icon="fi fi-rr-apps-add" label="Subcategory" value={detail.subcategory || '-'} />
                </div>
              </div>
              <div className="dv2-product-image-box">
                {detail.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.image_url} alt={detail.sku || ''} />
                ) : (
                  <i className="fa-solid fa-image no-image" />
                )}
              </div>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-building" label="Application" value={detail.application || '-'} />
              <DvCard icon="fi fi-rr-box" label="UOM" value={detail.uom || 'Pcs'} />
              <DvCard icon="fi fi-rr-award" label="Brand" value={detail.brand || '-'} />
            </div>
            {SPEC_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="dv2-section-title"><i className={g.icon} /> {g.title}</div>
                <div className="dv2-grid">
                  {g.fields.map((f) => (
                    <DvCard key={f.key} icon={f.icon} label={f.label} value={detail[f.key] || '-'} />
                  ))}
                </div>
              </div>
            ))}
            <div className="dv2-section-title"><i className="fi fi-rr-box-open" /> Data Pengemasan (Packing)</div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-box-open" label="Jenis Kemasan" value={detail.package_type || 'Carton'} />
              <DvCard icon="fi fi-rr-apps" label={`Isi per Kemasan (${detail.uom || 'Pcs'})`} value={String(Number(detail.units_per_package) || '-')} />
              <DvCard icon="fi fi-rr-balance-scale-left" label="Berat Bersih / Unit (Kg)" value={String(Number(detail.net_weight) || '-')} />
              <DvCard icon="fi fi-rr-balance-scale-left" label="Berat Kotor / Kemasan (Kg)" value={String(Number(detail.gross_weight) || '-')} />
              <DvCard icon="fi fi-rr-ruler-combined" label="Dimensi Kemasan P x L x T (cm)" value={Number(detail.pkg_length_cm) || Number(detail.pkg_width_cm) || Number(detail.pkg_height_cm) ? `${Number(detail.pkg_length_cm)} x ${Number(detail.pkg_width_cm)} x ${Number(detail.pkg_height_cm)}` : '-'} />
            </div>
            {detail.notes && (
              <>
                <div className="dv2-section-title"><i className="fi fi-rr-document" /> Notes</div>
                <div className="dv2-card">
                  <div><div className="dv2-card-value" style={{ fontWeight: 500 }}>{detail.notes}</div></div>
                </div>
              </>
            )}
          </div>
        </DetailModal>
      )}

      {modalOpen && (
        <FormModal full
          title={form.id ? 'Edit Product' : 'New Product'}
          icon={form.id ? 'fa-solid fa-pencil' : 'fa-solid fa-box-open'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Batal
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-picture" /> Image Reference</div>
            <div
              className="fv2-upload-box"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              {uploading ? (
                <div className="txt">Sedang mengunggah...</div>
              ) : form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="" />
              ) : (
                <>
                  <div className="icon"><i className="fi fi-rr-cloud-upload" /></div>
                  <div className="txt">Klik atau seret foto ke area ini</div>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="fv2-hint">Format JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.</div>
          </div>

          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-box" /> Informasi Produk</div>
            <div className="fv2-grid">
              <FvField label="SKU No">
                <input value={skuView} placeholder="Dibuat otomatis oleh sistem" readOnly />
              </FvField>
              <FvField label="Product Name" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masukkan nama produk" />
              </FvField>
              <FvField label="Brand">
                <BrandSelect
                  value={form.brand || ''}
                  onChange={(v) => setForm({ ...form, brand: v || 'FANOS' })}
                  brands={brandList}
                  onAdded={(n) => { setBrandList((b) => (b.includes(n) ? b : [...b, n].sort())); setForm((f) => ({ ...f, brand: n })); }}
                />
              </FvField>
              <FvField label="Main Category" required>
                <FvSelect
                  value={form.category || ''}
                  onChange={(v) => setForm({ ...form, category: v, subcategory: '' })}
                  options={toOptions(Object.keys(PRODUCT_CATEGORIES))}
                />
              </FvField>
              <FvField label="Subcategory">
                <FvSelect
                  value={form.subcategory || ''}
                  onChange={(v) => setForm({ ...form, subcategory: v })}
                  options={toOptions((PRODUCT_CATEGORIES[form.category || ''] ?? []))}
                  placeholder={form.category ? '— Pilih salah satu —' : 'Pilih Main Category terlebih dahulu'}
                  disabled={!form.category}
                />
              </FvField>
              <FvField label="Application">
                <FvSelect
                  value={form.application || ''}
                  onChange={(v) => setForm({ ...form, application: v })}
                  options={toOptions(PRODUCT_APPLICATION_OPTIONS)}
                />
              </FvField>
              <FvField label="UOM">
                <FvSelect
                  value={form.uom}
                  onChange={(v) => setForm({ ...form, uom: v || 'Pcs' })}
                  options={toOptions(UOM_OPTIONS)}
                  placeholder="Pcs"
                />
              </FvField>
            </div>
          </div>

          {SPEC_GROUPS.map((g) => (
            <div className="fv2-section" key={g.title}>
              <div className="fv2-section-title"><i className={g.icon} /> {g.title}</div>
              <div className="fv2-grid">
                {g.fields.map((f) => (
                  <FvField key={f.key} label={f.label}>
                    <input
                      value={form[f.key] || ''}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                    />
                  </FvField>
                ))}
              </div>
            </div>
          ))}

          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-box-open" /> Data Pengemasan (Packing)</div>
            <div className="fv2-grid">
              <FvField label="Jenis Kemasan">
                <FvSelect value={form.package_type || 'Carton'} onChange={(v) => setForm({ ...form, package_type: v || 'Carton' })} options={PACKAGE_TYPES.map((t) => ({ value: t, label: t }))} placeholder="Carton" />
              </FvField>
              <FvField label={`Isi per Kemasan (${form.uom || 'Pcs'})`}>
                <input type="number" min={0} value={form.units_per_package || 0} onChange={(e) => setForm({ ...form, units_per_package: parseFloat(e.target.value) || 0 })} />
              </FvField>
              <FvField label="Berat Bersih / Unit (Kg)">
                <input type="number" min={0} step="0.001" value={form.net_weight || 0} onChange={(e) => setForm({ ...form, net_weight: parseFloat(e.target.value) || 0 })} />
              </FvField>
              <FvField label="Berat Kotor / Kemasan (Kg)">
                <input type="number" min={0} step="0.001" value={form.gross_weight || 0} onChange={(e) => setForm({ ...form, gross_weight: parseFloat(e.target.value) || 0 })} />
              </FvField>
              <FvField label="Panjang Kemasan (cm)">
                <input type="number" min={0} value={form.pkg_length_cm || 0} onChange={(e) => setForm({ ...form, pkg_length_cm: parseFloat(e.target.value) || 0 })} />
              </FvField>
              <FvField label="Lebar Kemasan (cm)">
                <input type="number" min={0} value={form.pkg_width_cm || 0} onChange={(e) => setForm({ ...form, pkg_width_cm: parseFloat(e.target.value) || 0 })} />
              </FvField>
              <FvField label="Tinggi Kemasan (cm)">
                <input type="number" min={0} value={form.pkg_height_cm || 0} onChange={(e) => setForm({ ...form, pkg_height_cm: parseFloat(e.target.value) || 0 })} />
              </FvField>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Data ini terisi otomatis di Packing List (jenis kemasan, isi per kemasan, NW, GW, dimensi, dan CBM) dan tetap bisa diubah per dokumen.</p>
          </div>

          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-document" /> Catatan</div>
            <div>
              <FvField label="Notes">
                <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan (opsional)" />
              </FvField>
            </div>
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <DeleteModal
          title="Konfirmasi Hapus"
          itemName={`${deleteTarget.sku ?? ''} — ${deleteTarget.name}`}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </RegistryCard>
  );
}
