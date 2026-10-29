'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/Toast';
import { FormModal, FvField } from '@/components/registry/RegistryModal';
import FvSelect, { toOptions } from '@/components/registry/FvSelect';
import FinanceSelect from '@/components/registry/FinanceSelect';
import { PROJECT_TRIGGER_OPTIONS, PROJECT_TYPE_OPTIONS } from '@/lib/master-options';
import { saveClient, type ClientInput } from '@/app/(dashboard)/dashboard/clients/actions';
import { saveProject, type ProjectInput } from '@/app/(dashboard)/dashboard/projects/actions';
import { getProjectClientLookups, getBrandNames } from '@/lib/quick-add-actions';
import { PRODUCT_APPLICATION_OPTIONS, PRODUCT_CATEGORIES, UOM_OPTIONS } from '@/lib/master-options';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { SPEC_GROUPS, SPEC_KEYS, PACK_NUM_KEYS, type SpecKey, type PackNumKey } from '@/app/(dashboard)/dashboard/products/fields';
import { PACKAGE_TYPES } from '@/lib/packing';
import { saveProduct, type ProductInput } from '@/app/(dashboard)/dashboard/products/actions';
import type { ProductOption } from '@/components/ProductPicker';

const STATUSES = ['Active', 'Inactive', 'Blacklist', 'Unverified'];

// Form tambah Client baru: isinya sama dengan New Client di Master Data.
export function ClientQuickModal({ onClose, onSaved }: { onClose: () => void; onSaved: (c: { id: string; company: string }) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<ClientInput>({ company: '', contact_name: '', position: '', phone: '', email: '', address: '', credit_limit: null, status: 'Unverified' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await saveClient(form);
      if (r.error) return toast(r.error, 'error');
      toast('Data Client berhasil ditambahkan', 'success');
      onSaved({ id: r.id as string, company: r.company as string });
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      title="New Client"
      icon="fa-solid fa-user-plus"
      maxWidth={860}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
        </>
      }
    >
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-building" /> Informasi Perusahaan</div>
        <div className="fv2-grid">
          <FvField label="Client No"><input value="" placeholder="Dibuat otomatis oleh sistem" readOnly /></FvField>
          <FvField label="Company Name" required>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="PT Contoh Sejahtera" />
          </FvField>
        </div>
        <div style={{ marginTop: 14 }}>
          <FvField label="Company Address">
            <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap perusahaan" />
          </FvField>
        </div>
        <div className="fv2-grid" style={{ marginTop: 14 }}>
          <FvField label="Status">
            <FvSelect value={form.status || 'Unverified'} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES.map((x) => ({ value: x, label: x }))} placeholder="Status" />
          </FvField>
          <FvField label="Credit Limit">
            <FinanceSelect kind="credit_limit" useAmount value={form.credit_limit == null ? '' : String(form.credit_limit)} onChange={(v) => setForm({ ...form, credit_limit: v === '' ? null : Number(v) })} />
          </FvField>
        </div>
      </div>
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-user" /> Kontak</div>
        <div className="fv2-grid">
          <FvField label="Contact Person">
            <input value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Nama penanggung jawab (PIC)" />
          </FvField>
          <FvField label="Position">
            <input value={form.position || ''} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Jabatan penanggung jawab" />
          </FvField>
          <FvField label="Phone">
            <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xx-xxxx-xxxx" />
          </FvField>
          <FvField label="Email">
            <input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nama@perusahaan.com" />
          </FvField>
        </div>
      </div>
    </FormModal>
  );
}

// Form tambah Project baru: isinya sama dengan New Project di Master Data.
export function ProjectQuickModal({
  defaultClientId,
  onClose,
  onSaved,
}: {
  defaultClientId?: string;
  onClose: () => void;
  onSaved: (p: { id: string; name: string; client_id: string | null }) => void;
}) {
  const toast = useToast();
  const [clients, setClients] = useState<{ id: string; company: string; contact_name: string | null }[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [form, setForm] = useState<ProjectInput>({ name: '', location: '', classification: '', project_type: '', client_id: defaultClientId || '', trigger_source: '', triggered_by: '', top: '', cashback: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProjectClientLookups().then((d) => { setClients(d.clients); setClasses(d.classifications); }).catch(() => {});
  }, []);
  const selectedClient = clients.find((c) => c.id === form.client_id);

  async function save() {
    setSaving(true);
    try {
      const r = await saveProject(form);
      if (r.error) return toast(r.error, 'error');
      toast('Data Project berhasil ditambahkan', 'success');
      onSaved({ id: r.id as string, name: r.name as string, client_id: (r.client_id as string | null) ?? null });
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      title="New Project"
      icon="fa-solid fa-folder-plus"
      maxWidth={860}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
        </>
      }
    >
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-briefcase" /> Informasi Project</div>
        <div className="fv2-grid">
          <FvField label="Project No"><input value="" placeholder="Dibuat otomatis oleh sistem" readOnly /></FvField>
          <FvField label="Project Name" required>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masukkan nama proyek" />
          </FvField>
          <FvField label="Project Location">
            <input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Lokasi proyek (kota/wilayah)" />
          </FvField>
          <FvField label="Project Classification">
            <FvSelect value={form.classification || ''} onChange={(v) => setForm({ ...form, classification: v })} options={toOptions(classes)} />
          </FvField>
          <FvField label="Project Type">
            <FvSelect value={form.project_type || ''} onChange={(v) => setForm({ ...form, project_type: v })} options={toOptions(PROJECT_TYPE_OPTIONS)} />
          </FvField>
        </div>
      </div>
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-building" /> Client</div>
        <div className="fv2-grid">
          <FvField label="Client Company">
            <FvSelect value={form.client_id || ''} onChange={(v) => setForm({ ...form, client_id: v })} options={clients.map((c) => ({ value: c.id, label: c.company }))} placeholder="— Pilih client —" />
          </FvField>
          <FvField label="Client Name">
            <input value={selectedClient?.contact_name || ''} placeholder="Terisi otomatis sesuai Client Company" readOnly />
          </FvField>
        </div>
      </div>
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-bullseye-arrow" /> Trigger & Pembayaran</div>
        <div className="fv2-grid">
          <FvField label="Trigger">
            <FvSelect value={form.trigger_source || ''} onChange={(v) => setForm({ ...form, trigger_source: v })} options={toOptions(PROJECT_TRIGGER_OPTIONS)} />
          </FvField>
          <FvField label="Triggered By">
            <FvSelect value={form.triggered_by || ''} onChange={(v) => setForm({ ...form, triggered_by: v })} options={clients.map((c) => ({ value: c.company, label: c.company }))} placeholder="— Pilih client —" />
          </FvField>
          <FvField label="Term of Payment">
            <FinanceSelect kind="payment_term" value={form.top || ''} onChange={(v) => setForm({ ...form, top: v })} />
          </FvField>
          <FvField label="Cashback">
            <FinanceSelect kind="cashback" value={form.cashback || ''} onChange={(v) => setForm({ ...form, cashback: v })} />
          </FvField>
        </div>
      </div>
    </FormModal>
  );
}

const ALLOWED_IMG = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMG = 2 * 1024 * 1024;
const EMPTY_SPECS = Object.fromEntries(SPEC_KEYS.map((k) => [k, ''])) as Record<SpecKey, string>;
const EMPTY_PACK = { package_type: 'Carton', ...Object.fromEntries(PACK_NUM_KEYS.map((k) => [k, 0])) } as { package_type: string } & Record<PackNumKey, number>;

// Form tambah Product baru: isinya sama dengan New Product di Master Data > Product Catalogue.
export function ProductQuickModal({ onClose, onSaved }: { onClose: () => void; onSaved: (p: ProductOption) => void }) {
  const toast = useToast();
  const supabase = createBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [form, setForm] = useState<ProductInput>({ name: '', brand: 'FANOS', image_url: '', category: '', subcategory: '', application: '', uom: 'Pcs', notes: '', ...EMPTY_SPECS, ...EMPTY_PACK });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getBrandNames().then(setBrands).catch(() => {});
  }, []);

  async function handleFile(file: File) {
    if (!ALLOWED_IMG.includes(file.type)) return toast('Format berkas tidak didukung. Gunakan format JPG, PNG, atau WebP.', 'error');
    if (file.size > MAX_IMG) return toast('Ukuran berkas melebihi batas maksimum 2 MB.', 'error');
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, file);
      if (upErr) return toast('Unggah berkas gagal: ' + upErr.message, 'error');
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
      const r = await saveProduct(form);
      if (r.error) return toast(r.error, 'error');
      if (!r.product) return toast('Produk tersimpan, tetapi data tidak terbaca. Muat ulang halaman.', 'error');
      toast('Data Produk berhasil ditambahkan', 'success');
      onSaved(r.product);
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      maxWidth={980}
      title="New Product"
      icon="fa-solid fa-box-open"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || uploading}>
            <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
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
                <input value="" placeholder="Dibuat otomatis oleh sistem" readOnly />
              </FvField>
              <FvField label="Product Name" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masukkan nama produk" />
              </FvField>
              <FvField label="Brand">
                <FvSelect
                  value={form.brand || ''}
                  onChange={(v) => setForm({ ...form, brand: v || 'FANOS' })}
                  options={toOptions(brands.includes(form.brand || '') ? brands : [...brands, form.brand || 'FANOS'])}
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
  );
}
