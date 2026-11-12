'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { ConfirmModal, FvField } from '@/components/registry/RegistryModal';
import { saveMaintenance } from './actions';

export default function MaintenanceForm({ initial }: { initial: { on: boolean; message: string; eta: string; scheduledAt: string } }) {
  const toast = useToast();
  const [on, setOn] = useState(initial.on);
  const [message, setMessage] = useState(initial.message);
  const [eta, setEta] = useState(initial.eta);
  // datetime-local memakai waktu lokal browser; disimpan sebagai ISO UTC.
  const toLocalInput = (iso: string) => { if (!iso) return ''; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [sched, setSched] = useState(toLocalInput(initial.scheduledAt));
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save(nextOn: boolean) {
    setBusy(true);
    const res = await saveMaintenance({ on: nextOn, message, eta, scheduledAt: sched ? new Date(sched).toISOString() : '' });
    setBusy(false); setConfirmOpen(false);
    if ('error' in res && res.error) { toast(res.error, 'error'); return; }
    setOn(nextOn);
    toast(nextOn === on ? 'Pengaturan maintenance disimpan' : nextOn ? 'Mode maintenance AKTIF' : 'Mode maintenance dimatikan', 'success');
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-settings" /> Status Maintenance</div>
        <div style={{ marginBottom: 14 }}>
          <span className="bi-chip" style={{ background: on ? '#fee2e2' : '#dcfce7', color: on ? '#991b1b' : '#166534' }}>{on ? 'Maintenance AKTIF' : 'Sistem normal'}</span>
        </div>
        <div className="fv2-grid cols-1">
          <FvField label="Pesan untuk pengguna (opsional)">
            <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mis. Kami sedang memperbarui sistem. Mohon coba lagi nanti." />
          </FvField>
          <FvField label="Jadwal mulai (opsional)">
            <input type="datetime-local" value={sched} onChange={(e) => setSched(e.target.value)} />
          </FvField>
          <FvField label="Perkiraan selesai (opsional)">
            <input value={eta} onChange={(e) => setEta(e.target.value)} placeholder="Mis. Hari ini pukul 15.00 WIB" />
          </FvField>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {on ? (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(false)}>Matikan Maintenance</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => save(true)}>Simpan Pesan &amp; Jadwal</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setConfirmOpen(true)}>Aktifkan Maintenance</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => save(false)}>Simpan Jadwal &amp; Pesan</button>
          </>
        )}
      </div>
    {confirmOpen && (
        <ConfirmModal
          title="Aktifkan Maintenance"
          icon="fi fi-rr-settings"
          tone="blue"
          question="Aktifkan mode maintenance sekarang?"
          itemName="Semua pengguna selain Superuser"
          note="Mereka akan langsung tidak bisa mengakses sistem sampai maintenance dimatikan."
          confirmLabel="Ya, Aktifkan"
          busy={busy}
          onConfirm={() => save(true)}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
