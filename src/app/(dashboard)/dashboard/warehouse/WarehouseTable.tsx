'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import RegistryCard from '@/components/registry/RegistryCard';
import { FormModal, DeleteModal, FvField } from '@/components/registry/RegistryModal';
import RowActions from '@/components/ui/RowActions';
import { useToast } from '@/components/Toast';
import { saveWarehouse, deleteWarehouse, type WarehouseInput } from './actions';

export type WarehouseRow = { id: string; code: string | null; name: string; address: string | null; is_default: boolean; is_active: boolean; total_qty: number };
const empty: WarehouseInput = { code: '', name: '', address: '', is_default: false, is_active: true };

export default function WarehouseTable({ initialRows }: { initialRows: WarehouseRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<WarehouseInput>(empty);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<WarehouseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? initialRows.filter((r) => [r.code, r.name, r.address].some((v) => (v || '').toLowerCase().includes(q))) : initialRows;
  }, [initialRows, search]);

  async function handleSave() {
    setSaving(true);
    try {
      const r = await saveWarehouse(form);
      if (r.error) return toast(r.error, 'error');
      toast(form.id ? 'Data Gudang berhasil diperbarui' : 'Data Gudang berhasil ditambahkan', 'success');
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete() {
    if (!target) return;
    setDeleting(true);
    try {
      const r = await deleteWarehouse(target.id);
      if (r.error) return toast(r.error, 'error');
      toast('Data Gudang berhasil dihapus', 'success');
      setTarget(null);
      router.refresh();
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard title="Warehouse" icon="fi fi-rr-warehouse-alt" search={search} onSearch={setSearch} addLabel="New Warehouse" addIcon="fi fi-rr-plus" onAdd={() => { setForm(empty); setOpen(true); }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Kode</th>
              <th className="px-4 py-3 font-semibold">Nama Gudang</th>
              <th className="px-4 py-3 font-semibold">Alamat</th>
              <th className="px-4 py-3 font-semibold">Total Stok</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum terdapat data gudang</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.code || '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.name} {r.is_default && <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">DEFAULT</span>}</td>
                <td className="px-4 py-3 text-slate-600">{r.address || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{r.total_qty}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{r.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="px-4 py-3">
                  <RowActions actions={[
                    { label: 'Edit', icon: 'fi fi-rr-pencil', onClick: () => { setForm({ id: r.id, code: r.code ?? '', name: r.name, address: r.address ?? '', is_default: r.is_default, is_active: r.is_active }); setOpen(true); } },
                    { label: 'Hapus', icon: 'fi fi-rr-trash', danger: true, onClick: () => setTarget(r) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <FormModal full title={form.id ? 'Edit Warehouse' : 'New Warehouse'} icon="fi fi-rr-warehouse-alt" onClose={() => setOpen(false)}
          footer={<>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}><i className="fa-solid fa-floppy-disk" /> {saving ? 'Menyimpan...' : 'Simpan'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Batal</button>
          </>}>
          <div className="fv2-section">
            <div className="fv2-grid">
              <FvField label="Kode Gudang"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Contoh: WH-002" /></FvField>
              <FvField label="Nama Gudang" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Gudang Bandung" /></FvField>
            </div>
            <div style={{ marginTop: 14 }}>
              <FvField label="Alamat"><input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alamat lengkap gudang" /></FvField>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 14, fontSize: 12.5, flexWrap: 'wrap' }}>
              <label><input type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Gudang default (dipakai otomatis oleh Delivery Order & retur)</label>
              <label><input type="checkbox" checked={form.is_active !== false || !!form.is_default} disabled={!!form.is_default} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Aktif</label>
            </div>
          </div>
        </FormModal>
      )}
      {target && <DeleteModal title="Konfirmasi Hapus" itemName={target.name} busy={deleting} onConfirm={handleDelete} onClose={() => setTarget(null)} />}
    </RegistryCard>
  );
}
