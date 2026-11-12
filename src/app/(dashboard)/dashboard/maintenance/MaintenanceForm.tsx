'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { ConfirmModal, FvField } from '@/components/registry/RegistryModal';
import { saveMaintenance } from './actions';

export default function MaintenanceForm({ initial }: { initial: { on: boolean; message: string; eta: string; scheduledAt: string } }) {
  const toast = useToast();
  const [on, setOn] = useState(initial.on);
  // datetime-local memakai waktu lokal browser; disimpan sebagai ISO UTC.
  const toLocalInput = (iso: string) => { if (!iso) return ''; const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [sched, setSched] = useState(toLocalInput(initial.scheduledAt));
  const [eta, setEta] = useState(Number.isNaN(Date.parse(initial.eta)) ? '' : toLocalInput(initial.eta));
  const [busy, setBusy] = useState(false);
  const future = !!sched && new Date(sched).getTime() > Date.now();
  const ended = on && !!eta && new Date(eta).getTime() <= Date.now();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Pesan ke pengguna baku (dua bahasa, di sistem); yang diatur hanya jadwal mulai & perkiraan selesai.
  async function save(nextOn: boolean) {
    if (nextOn && eta) {
      const start = sched ? new Date(sched).getTime() : Date.now();
      if (new Date(eta).getTime() <= start) { toast('Perkiraan selesai harus setelah waktu mulai.', 'error'); return; }
    }
    setBusy(true);
    const iso = (v: string) => (v ? new Date(v).toISOString() : '');
    const res = await saveMaintenance({ on: nextOn, message: '', eta: nextOn ? iso(eta) : '', scheduledAt: nextOn ? iso(sched) : '' });
    setBusy(false); setConfirmOpen(false);
    if ('error' in res && res.error) { toast(res.error, 'error'); return; }
    setOn(nextOn);
    if (!nextOn) { setSched(''); setEta(''); }
    toast(nextOn === on ? 'Pengaturan maintenance disimpan' : nextOn ? (future ? 'Maintenance dijadwalkan' : 'Mode maintenance AKTIF') : 'Mode maintenance dimatikan', 'success');
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="fv2-section">
        <div className="fv2-section-title"><i className="fi fi-rr-settings" /> Status Maintenance</div>
        <div style={{ marginBottom: 14 }}>
          <span className="bi-chip" style={{ background: on && !ended ? (future ? '#fef3c7' : '#fee2e2') : '#dcfce7', color: on && !ended ? (future ? '#92400e' : '#991b1b') : '#166534' }}>{ended ? 'Maintenance SELESAI (otomatis)' : on ? (future ? 'Maintenance TERJADWAL' : 'Maintenance AKTIF') : 'Sistem normal'}</span>
        </div>
        <div className="fv2-grid cols-1">
          <FvField label="Jadwal mulai (opsional)">
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="datetime-local" value={sched} onChange={(e) => setSched(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" onClick={() => setSched('')} disabled={!sched || busy}>Reset</button>
            </div>
          </FvField>
          <FvField label="Perkiraan selesai (opsional)">
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="btn btn-secondary" onClick={() => setEta('')} disabled={!eta || busy}>Reset</button>
            </div>
          </FvField>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Pesan untuk pengguna sudah baku dan otomatis mengikuti bahasa (Indonesia/Inggris), jadi tidak perlu diketik.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {on ? (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(false)}>Matikan Maintenance</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => save(true)}>Simpan Perubahan</button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setConfirmOpen(true)}>{future ? 'Jadwalkan Maintenance' : 'Aktifkan Maintenance'}</button>
        )}
      </div>
    {confirmOpen && (
        <ConfirmModal
          title={future ? 'Jadwalkan Maintenance' : 'Aktifkan Maintenance'}
          icon="fi fi-rr-settings"
          tone="blue"
          question={future ? 'Jadwalkan mode maintenance?' : 'Aktifkan mode maintenance sekarang?'}
          itemName="Semua pengguna selain Superuser"
          note={future ? 'Mereka melihat peringatan dini dengan hitung mundur, lalu otomatis diarahkan ke halaman maintenance saat jadwal tiba.' : 'Mereka akan langsung tidak bisa mengakses sistem sampai maintenance dimatikan.'}
          confirmLabel={future ? 'Ya, Jadwalkan' : 'Ya, Aktifkan'}
          busy={busy}
          onConfirm={() => save(true)}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
