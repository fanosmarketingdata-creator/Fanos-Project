'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import { savePrices } from '../actions';

export type PriceRow = {
  id: string; sku: string | null; name: string; brand: string | null; uom: string;
  price: number; cost_price: number | null; category: string | null; subcategory: string | null;
  wattage: string | null; cct: string | null; lumen: string | null; beam_angle: string | null; ip_rating: string | null;
};

const rupiah = (n: number | null) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

export default function PriceListTable({ initialRows }: { initialRows: PriceRow[] }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? initialRows.filter((r) => [r.sku, r.name, r.brand, r.category, r.subcategory].some((v) => (v || '').toLowerCase().includes(q)))
      : initialRows;
  }, [initialRows, search]);
  const paged = usePaged(filtered, search, 25);

  function startEdit(r: PriceRow) {
    setEditId(r.id);
    setCost(Number(r.cost_price) || 0);
    setPrice(Number(r.price) || 0);
  }
  async function save() {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await savePrices(editId, cost, price);
      if (res.error) return toast(res.error, 'error');
      toast('Harga berhasil diperbarui', 'success');
      setEditId(null);
    } catch (e) {
      toast('Data gagal disimpan: ' + (e instanceof Error ? e.message : 'terjadi kendala pada server'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RegistryCard
      title="Price List"
      icon="fi fi-rr-usd-circle"
      search={search}
      onSearch={setSearch}
      footer={<Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} />}
      info={search.trim() ? `${filtered.length} hasil` : undefined}
    >
      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>SKU</th><th>Product</th><th>Brand</th><th>Category</th>
              <th>Spec</th><th>UOM</th>
              <th style={{ textAlign: 'right' }}>Cost Price</th>
              <th style={{ textAlign: 'right' }}>Selling Price</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {paged.pageItems.length === 0 && (
              <tr><td colSpan={9} className="no-data-grid">Belum terdapat data produk</td></tr>
            )}
            {paged.pageItems.map((r) => {
              const editing = editId === r.id;
              const spec = [r.wattage && `${r.wattage}W`, r.cct && `${r.cct}K`, r.lumen && `${r.lumen}lm`, r.beam_angle && `${r.beam_angle}°`, r.ip_rating]
                .filter(Boolean).join(' · ') || '-';
              return (
                <tr key={r.id}>
                  <td>{r.sku}</td>
                  <td>{r.name}</td>
                  <td>{r.brand || '-'}</td>
                  <td>{[r.category, r.subcategory].filter(Boolean).join(' · ') || '-'}</td>
                  <td>{spec}</td>
                  <td>{r.uom}</td>
                  <td style={{ textAlign: 'right' }}>
                    {editing ? <input type="number" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} style={{ width: 120, textAlign: 'right' }} /> : rupiah(r.cost_price)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {editing ? <input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} style={{ width: 120, textAlign: 'right' }} /> : rupiah(r.price)}
                  </td>
                  <td>
                    {editing ? (
                      <>
                        <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={save} disabled={saving} title="Simpan"><i className="fa-solid fa-check" /></button>
                        <button type="button" className="btn-action-icon btn-delete btn-xs" onClick={() => setEditId(null)} title="Batal"><i className="fa-solid fa-xmark" /></button>
                      </>
                    ) : (
                      <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => startEdit(r)} title="Edit"><i className="fi fi-rr-pencil" /></button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </RegistryCard>
  );
}
