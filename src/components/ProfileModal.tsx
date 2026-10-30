'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase/client';
import { FormModal, FvField } from '@/components/registry/RegistryModal';
import { updateMyProfile } from '@/lib/profile-actions';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 2 * 1024 * 1024;

export type MyProfile = { id: string; full_name: string; role: string; photo_url: string | null; phone?: string | null; email?: string | null };

// Edit profil sendiri: nama, telepon, dan foto. Dirender lewat portal agar tidak terpotong header.
export default function ProfileModal({ profile, onClose }: { profile: MyProfile; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [photo, setPhoto] = useState(profile.photo_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) return toast('Format berkas tidak didukung. Gunakan format JPG, PNG, atau WebP.', 'error');
    if (file.size > MAX) return toast('Ukuran berkas melebihi batas maksimum 2 MB.', 'error');
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('profile-photos').upload(path, file);
      if (error) return toast('Unggah berkas gagal: ' + error.message, 'error');
      setPhoto(supabase.storage.from('profile-photos').getPublicUrl(path).data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const r = await updateMyProfile({ full_name: name, phone, photo_url: photo || null });
      if (r.error) return toast(r.error, 'error');
      toast('Profil berhasil diperbarui', 'success');
      router.refresh();
      onClose();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <FormModal
      title="Edit Profil"
      icon="fi fi-rr-user"
      maxWidth={620}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || uploading}>
            <i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
        </>
      }
    >
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-picture" /> Foto Profil</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#eaf1ff', color: '#3563e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, flex: 'none' }}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (name || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Sedang mengunggah...' : 'Ganti Foto'}
              </button>
              {photo && (
                <button type="button" className="btn btn-xs" onClick={() => setPhoto('')} style={{ background: '#fdeceb', color: '#dc2626', border: '1px solid #f7c6c3' }}>
                  <i className="fi fi-rr-trash" /> Hapus Foto
                </button>
              )}
            </div>
            <div className="fv2-hint" style={{ marginTop: 6 }}>Format JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.</div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>

      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-user" /> Informasi Akun</div>
        <div className="fv2-grid">
          <FvField label="Nama Lengkap" required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
          </FvField>
          <FvField label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx-xxxx-xxxx" />
          </FvField>
          <FvField label="Email">
            <input value={profile.email ?? ''} readOnly />
          </FvField>
          <FvField label="Role">
            <input value={profile.role} readOnly />
          </FvField>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>Email, role, kata sandi, dan status akun hanya dapat diubah oleh Superuser.</p>
      </div>

    </FormModal>,
    document.body
  );
}
