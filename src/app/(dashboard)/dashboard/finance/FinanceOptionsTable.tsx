'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import { DeleteModal } from '@/components/registry/RegistryModal';
import FinanceOptionModal from '@/components/registry/FinanceOptionModal';
import { FINANCE_KINDS, rupiahLabel, type FinanceKind, type FinanceOption } from '@/lib/finance';
import { deleteFinanceOption } from './actions';

export default function FinanceOptionsTable({ kind, rows }: { kind: FinanceKind; rows: FinanceOption[] }) {
  const cfg = FINANCE_KINDS[kind];
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ option?: FinanceOption } | null>(null);
  const [del, setDel] = useState<FinanceOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const valueText = (r: FinanceOption) =>
    cfg.mode === 'percent' ? `${r.value ?? 0}%` : cfg.mode === 'amount' ? rupiahLabel(r.value ?? 0) : '';

  async function handleDelete() {
    if (!del) return;
    setDeleting(true);
    try {
      const r = await deleteFinanceOption(del.id, kind);
      if (r.error) return toast(r.error, 'error');
      toast(`Data ${cfg.title} berhasil dihapus`, 'success');
      setDel(null);
    } catch (e) {
      toast('Data gagal dihapus: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <RegistryCard
      title={cfg.title}
      icon={cfg.icon}
      search={search}
      onSearch={setSearch}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
      addLabel={`New ${cfg.title}`}
      addIcon="fi fi-rr-plus"
      onAdd={() => setForm({})}
    >
      <div className="product-grid-wrap">
        <div className="client-card-list">
          {filtered.length === 0 && <div className="no-data-grid">Belum terdapat data {cfg.title.toLowerCase()}</div>}
          {filtered.map((r) => (
            <div key={r.id} className="client-card">
              <div className="client-card-avatar"><i className={cfg.icon} /></div>
              <div className="client-card-main">
                <div className="name">{r.name}</div>
                {valueText(r) && r.name !== valueText(r) && <div className="sub">{valueText(r)}</div>}
              </div>
              <div className="client-card-actions">
                <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => setForm({ option: r })} title="Edit">
                  <i className="fi fi-rr-pencil" />
                </button>
                <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setDel(r)} title="Hapus">
                  <i className="fi fi-rr-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {form && (
        <FinanceOptionModal
          kind={kind}
          option={form.option}
          onClose={() => setForm(null)}
          onSaved={() => {
            toast(`Data ${cfg.title} berhasil disimpan`, 'success');
            setForm(null);
          }}
        />
      )}
      {del && <DeleteModal title="Konfirmasi Hapus" itemName={del.name} busy={deleting} onConfirm={handleDelete} onClose={() => setDel(null)} />}
    </RegistryCard>
  );
}
