'use client';

import { useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { FormModal, DetailModal, DeleteModal, DvCard, FvField } from '@/components/registry/RegistryModal';
import { saveProduct, deleteProduct, type ProductInput } from './actions';

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  uom: string;
  price: number;
  image_url: string | null;
  category: string | null;
};

const emptyForm: ProductInput = { sku: '', name: '', brand: '', uom: 'Pcs', price: 0, image_url: '', category: '' };
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB — kriteria sama seperti sistem lama
const rupiah = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

export default function ProductsTable({ initialProducts }: { initialProducts: ProductRow[] }) {
  const toast = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detail, setDetail] = useState<ProductRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Urut brand lalu SKU, seperti renderProducts() di index.html.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? initialProducts.filter((p) =>
          [p.sku, p.name, p.brand, p.category, p.uom].some((v) => (v || '').toLowerCase().includes(q))
        )
      : initialProducts;
    return rows.slice().sort((a, b) => (a.brand || '').localeCompare(b.brand || '') || a.sku.localeCompare(b.sku));
  }, [initialProducts, search]);

  const paged = usePaged(filtered, search, 24);

  function openAdd() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: ProductRow) {
    setForm({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand || '',
      uom: p.uom,
      price: p.price,
      image_url: p.image_url || '',
      category: p.category || '',
    });
    setModalOpen(true);
  }

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast('Format tidak didukung. Gunakan JPG, PNG, atau WebP.', 'error');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast('Ukuran file terlalu besar (maks 2MB).', 'error');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) {
        toast('Upload gagal: ' + uploadError.message, 'error');
        return;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast('Foto berhasil diunggah', 'success');
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
      toast(form.id ? 'Produk diperbarui' : 'Produk ditambahkan', 'success');
      setModalOpen(false);
    } catch (e) {
      toast('Gagal menyimpan: ' + (e instanceof Error ? e.message : 'kesalahan server'), 'error');
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
      toast('Produk dihapus', 'success');
      setDeleteTarget(null);
    } catch (e) {
      toast('Gagal menghapus: ' + (e instanceof Error ? e.message : 'kesalahan server'), 'error');
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
          {paged.pageItems.length === 0 && <div className="no-data-grid">No products</div>}
          {paged.pageItems.map((p) => (
            <div key={p.id} className="product-card">
              <div className="product-card-image" onClick={() => setDetail(p)}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.sku} loading="lazy" />
                ) : (
                  <i className="fa-solid fa-image no-image" />
                )}
              </div>
              <div className="product-card-body" onClick={() => setDetail(p)}>
                <span className="product-card-sku">{p.sku}</span>
                <div className="product-card-brand">{p.brand || p.name}</div>
                <div className="product-card-type">{p.brand ? p.name : p.category || '-'}</div>
                <div className="product-card-spec">{p.brand && p.category ? p.category : ' '}</div>
                <div className="product-card-price">
                  <span className="selling">{rupiah(p.price)}</span>
                  <span className="uom">{p.uom || 'Pcs'}</span>
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
                <div className="dv2-topbar-title" style={{ marginBottom: 10 }}>{detail.brand || detail.name}</div>
                <div className="dv2-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <DvCard icon="fi fi-rr-tag" label="Nama Produk" value={detail.name} />
                  <DvCard icon="fi fi-rr-box" label="UOM" value={detail.uom || 'Pcs'} />
                </div>
              </div>
              <div className="dv2-product-image-box">
                {detail.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.image_url} alt={detail.sku} />
                ) : (
                  <i className="fa-solid fa-image no-image" />
                )}
              </div>
            </div>
            <div className="dv2-grid">
              <DvCard icon="fi fi-rr-apps" label="Kategori" value={detail.category || '-'} />
              <DvCard icon="fi fi-rr-money-bill" label="Selling Price" value={rupiah(detail.price)} color="#16a34a" />
            </div>
          </div>
        </DetailModal>
      )}

      {modalOpen && (
        <FormModal
          title={form.id ? 'Edit Product' : 'New Product'}
          icon={form.id ? 'fa-solid fa-pencil' : 'fa-solid fa-box-open'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
                <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </>
          }
        >
          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-picture" /> Foto Produk</div>
            <div
              className="fv2-upload-box"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              {uploading ? (
                <div className="txt">Mengunggah...</div>
              ) : form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image_url} alt="" />
              ) : (
                <>
                  <div className="icon"><i className="fi fi-rr-cloud-upload" /></div>
                  <div className="txt">Klik / drag foto ke sini</div>
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
            <div className="fv2-hint">JPG / PNG / WebP, maks 2MB.</div>
          </div>

          <div className="fv2-section">
            <div className="fv2-section-title"><i className="fi fi-rr-box" /> Informasi Produk</div>
            <div className="fv2-grid">
              <FvField label="SKU" required>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Kode SKU" />
              </FvField>
              <FvField label="Nama Produk" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" />
              </FvField>
              <FvField label="Brand">
                <input value={form.brand || ''} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Brand" />
              </FvField>
              <FvField label="Kategori">
                <input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori" />
              </FvField>
              <FvField label="UOM">
                <input value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })} placeholder="Pcs" />
              </FvField>
              <FvField label="Selling Price (Rp)">
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </FvField>
            </div>
          </div>
        </FormModal>
      )}

      {deleteTarget && (
        <DeleteModal
          title="Konfirmasi Hapus"
          itemName={`${deleteTarget.sku} — ${deleteTarget.name}`}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </RegistryCard>
  );
}
