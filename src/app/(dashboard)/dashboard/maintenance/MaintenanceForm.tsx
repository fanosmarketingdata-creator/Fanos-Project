'use client';

import { useState } from 'react';
import { useToast } from '@/components/Toast';
import { saveMaintenance } from './actions';

export default function MaintenanceForm({ initial }: { initial: { on: boolean; message: string; eta: string } }) {
  const toast = useToast();
  const [on, setOn] = useState(initial.on);
  const [message, setMessage] = useState(initial.message);
  const [eta, setEta] = useState(initial.eta);
  const [busy, setBusy] = useState(false);

  async function save(nextOn: boolean) {
    if (nextOn && !window.confirm('Aktifkan mode maintenance? Semua pengguna selain Superuser akan langsung tidak bisa mengakses sistem.')) return;
    setBusy(true);
    const res = await saveMaintenance({ on: nextOn, message, eta });
    setBusy(false);
    if ('error' in res && res.error) { toast(res.error, 'error'); return; }
    setOn(nextOn);
    toast(nextOn ? 'Mode maintenance AKTIF' : 'Mode maintenance dimatikan', 'success');
  }

  return (
    <div className="card" style={{ maxWidth: 640, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span className="bi-chip" style={{ background: on ? '#fee2e2' : '#dcfce7', color: on ? '#991b1b' : '#166534' }}>{on ? 'Maintenance AKTIF' : 'Sistem normal'}</span>
      </div>
      <label className="block text-sm font-semibold mb-1">Pesan untuk pengguna (opsional)</label>
      <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mis. Kami sedang memperbarui sistem. Mohon coba lagi nanti." style={{ width: '100%', marginBottom: 12 }} />
      <label className="block text-sm font-semibold mb-1">Perkiraan selesai (opsional)</label>
      <input className="input" value={eta} onChange={(e) => setEta(e.target.value)} placeholder="Mis. Hari ini pukul 15.00 WIB" style={{ width: '100%', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {on ? (
          <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(false)}>Matikan Maintenance</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => save(true)}>Simpan Pesan</button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save(true)}>Aktifkan Maintenance</button>
        )}
      </div>
    </div>
  );
}
