'use client';

import { useMemo, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
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

export default function ProductsTable({ initialProducts }: { initialProducts: ProductRow[] }) {
  const toast = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialProducts;
    return initialProducts.filter(
      (p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
    );
  }, [initialProducts, search]);

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
    const ext = file.name.split('.').pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
    setUploading(false);

    if (uploadError) {
      toast('Upload gagal: ' + uploadError.message, 'error');
      return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    toast('Foto berhasil diunggah', 'success');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveProduct(form);
    setSaving(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(form.id ? 'Produk diperbarui' : 'Produk ditambahkan', 'success');
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteProduct(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Produk dihapus', 'success');
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari SKU / nama produk..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Tambah Produk
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Foto</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Nama Produk</th>
              <th className="px-4 py-3 font-semibold">Brand</th>
              <th className="px-4 py-3 font-semibold">UOM</th>
              <th className="px-4 py-3 font-semibold">Harga</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Belum ada data produk
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">📦</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.sku}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.brand || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{p.uom}</td>
                <td className="px-4 py-3 text-slate-600">Rp {p.price.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => openEdit(p)}
                      className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={form.id ? 'Edit Produk' : 'Tambah Produk'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="flex gap-4">
            <div className="shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center hover:border-brand-500 hover:bg-brand-50"
              >
                {uploading ? (
                  <span className="text-xs text-slate-400">Mengunggah...</span>
                ) : form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="px-2 text-[11px] text-slate-400">Klik / drag foto</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <p className="mt-1.5 w-28 text-[10px] text-slate-400">JPG/PNG/WebP, maks 2MB</p>
            </div>

            <div className="flex-1 space-y-3">
              <Field label="SKU *" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
              <Field label="Nama Produk *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand" value={form.brand || ''} onChange={(v) => setForm({ ...form, brand: v })} />
                <Field label="UOM" value={form.uom} onChange={(v) => setForm({ ...form, uom: v })} />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Harga</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
              />
            </div>
            <Field label="Kategori" value={form.category || ''} onChange={(v) => setForm({ ...form, category: v })} />
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Hapus Produk"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Yakin ingin menghapus produk <strong>{deleteTarget.name}</strong>? Tindakan ini tidak bisa dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
      />
    </div>
  );
}
