'use client';

import RupiahInput from '@/components/ui/RupiahInput';
import { useState } from 'react';
import { FormModal, FvField } from '@/components/registry/RegistryModal';
import { FINANCE_KINDS, type FinanceKind, type FinanceOption } from '@/lib/finance';
import { saveFinanceOption } from '@/app/(dashboard)/dashboard/finance/actions';

// Form tambah/ubah satu data master Finance. Dipakai halaman master dan dropdown "tambah baru".
export default function FinanceOptionModal({
  kind, option, onClose, onSaved,
}: {
  kind: FinanceKind;
  option?: FinanceOption;
  onClose: () => void;
  onSaved: (o: FinanceOption) => void;
}) {
  const cfg = FINANCE_KINDS[kind];
  const [name, setName] = useState(option?.name ?? '');
  const [value, setValue] = useState(option?.value == null ? '' : String(option.value));
  const [bank, setBank] = useState({ bank_name: option?.bank_name ?? '', account_no: option?.account_no ?? '', account_holder: option?.account_holder ?? '', account_note: option?.account_note ?? '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setSaving(true);
    setErr('');
    try {
      const r = await saveFinanceOption({ id: option?.id, kind, name, value: value === '' ? null : Number(value), ...(kind === 'payment_method' ? bank : {}) });
      if (r.error || !r.option) return setErr(r.error ?? 'Data gagal disimpan.');
      onSaved(r.option);
    } catch (e) {
      setErr('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      title={(option ? 'Edit ' : 'New ') + cfg.title}
      icon={cfg.icon}
      maxWidth={480}
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
        {err && <div style={{ color: '#dc2626', fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
        {cfg.mode !== 'amount' && (
          <FvField label={cfg.nameLabel} required>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={cfg.example} autoFocus />
          </FvField>
        )}
        {cfg.mode !== 'none' && (
          <div style={{ marginTop: cfg.mode === 'amount' ? 0 : 14 }}>
            <FvField label={cfg.valueLabel ?? 'Nilai'} required>
              {cfg.mode === 'amount' ? (
              <RupiahInput value={value} onValue={(n) => setValue(String(n))} autoFocus />
            ) : (
              <input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            )}
            </FvField>
          </div>
        )}
        {kind === 'payment_method' && (
          <>
            <div style={{ marginTop: 18, fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Keterangan Rekening (opsional — tampil di dokumen cetak)</div>
            <div style={{ marginTop: 8 }}><FvField label="Bank / Cabang"><input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} placeholder="Contoh: BCA KCP Mahkota Ancol" /></FvField></div>
            <div style={{ marginTop: 14 }}><FvField label="No. Rekening"><input value={bank.account_no} onChange={(e) => setBank({ ...bank, account_no: e.target.value })} placeholder="0000 0000 00" /></FvField></div>
            <div style={{ marginTop: 14 }}><FvField label="Atas Nama"><input value={bank.account_holder} onChange={(e) => setBank({ ...bank, account_holder: e.target.value })} placeholder="Nama pemilik rekening" /></FvField></div>
            <div style={{ marginTop: 14 }}><FvField label="Keterangan Tambahan"><input value={bank.account_note} onChange={(e) => setBank({ ...bank, account_note: e.target.value })} placeholder="Contoh: Mohon cantumkan No. Invoice" /></FvField></div>
          </>
        )}
        {cfg.mode === 'amount' && (
          <div style={{ marginTop: 14 }}>
            <FvField label={cfg.nameLabel}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={cfg.example} />
            </FvField>
          </div>
        )}
      </div>
    </FormModal>
  );
}
