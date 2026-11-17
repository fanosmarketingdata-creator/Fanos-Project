'use client';

import { useMemo, useState } from 'react';
import RegistryCard from '@/components/registry/RegistryCard';
import Pagination, { usePaged } from '@/components/registry/Pagination';
import SortHeader, { useSorted, type SortCol } from '@/components/registry/SortHeader';
import { FullModal } from '@/components/registry/RegistryModal';
import Select from '@/components/ui/Select';
import { useLang } from '@/components/I18nProvider';
import { ACTION_META, actionVerb, entityLabel, fmtDateTime, recordText, type AuditLog } from '@/lib/audit';

const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export default function AuditLogTable({ initialRows }: { initialRows: AuditLog[] }) {
  const en = useLang() === 'en';
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [user, setUser] = useState('');
  const [detail, setDetail] = useState<AuditLog | null>(null);

  const entities = useMemo(() => Array.from(new Set(initialRows.map((r) => r.table_name))).sort(), [initialRows]);
  const users = useMemo(() => Array.from(new Set(initialRows.map((r) => r.user_name || 'System'))).sort(), [initialRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialRows.filter((r) => {
      if (action && r.action !== action) return false;
      if (entity && r.table_name !== entity) return false;
      if (user && (r.user_name || 'System') !== user) return false;
      if (!q) return true;
      return [r.user_name, r.record_code, r.record_label, entityLabel(r.table_name, true), entityLabel(r.table_name, false), r.table_name].some((x) => (x ?? '').toLowerCase().includes(q));
    });
  }, [initialRows, search, action, entity, user]);

  const sortCols: SortCol<AuditLog>[] = [
    { key: 'what', label: 'Activity', get: (r) => `${r.user_name ?? ''} ${r.action}` },
    { key: 'entity', label: 'Data', get: (r) => entityLabel(r.table_name, en) },
    { key: 'code', label: 'ID', get: (r) => r.record_code },
    { key: 'record', label: 'Record', get: (r) => r.record_label },
    { key: 'time', label: 'Time', get: (r) => Date.parse(r.created_at) },
  ];
  const { sorted, sort, toggle } = useSorted(filtered, sortCols);
  const paged = usePaged(sorted, search + action + entity + user);

  const filters = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 130 }}>
        <Select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">{en ? 'All actions' : 'Semua aksi'}</option>
          <option value="create">{en ? 'Create' : 'Tambah'}</option>
          <option value="update">{en ? 'Update' : 'Ubah'}</option>
          <option value="delete">{en ? 'Delete' : 'Hapus'}</option>
        </Select>
      </div>
      <div style={{ minWidth: 160 }}>
        <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">{en ? 'All data' : 'Semua data'}</option>
          {entities.map((t) => <option key={t} value={t}>{entityLabel(t, en)}</option>)}
        </Select>
      </div>
      <div style={{ minWidth: 150 }}>
        <Select value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="">{en ? 'All users' : 'Semua user'}</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
      </div>
    </div>
  );

  const changes = detail?.changes ? Object.entries(detail.changes) : [];

  return (
    <RegistryCard
      title="Audit Log"
      icon="fi fi-rr-time-past"
      search={search}
      onSearch={setSearch}
      info={`${filtered.length} ${en ? 'activities' : 'aktivitas'}`}
      extra={filters}
      footer={<Pagination total={paged.total} page={paged.page} totalPages={paged.totalPages} rowsPerPage={paged.rowsPerPage} onPage={paged.setPage} onRows={paged.setRowsPerPage} />}
    >
      <div className="product-grid-wrap">
        <SortHeader main={sortCols[0]} cols={sortCols.slice(1)} sort={sort} onSort={toggle} />
        <div className="client-card-list" data-no-i18n>
          {paged.total === 0 && <div className="no-data-grid">{en ? 'No activity recorded yet' : 'Belum ada aktivitas tercatat'}</div>}
          {paged.pageItems.map((r) => {
            const m = ACTION_META[r.action];
            return (
              <div key={r.id} className="client-card">
                <div className="client-card-avatar" style={{ background: m.color, color: '#fff' }}><i className={`${m.icon} leading-none`} /></div>
                <div className="client-card-main">
                  <div className="name">{r.user_name || 'System'} <span style={{ fontWeight: 500 }}>{actionVerb(r.action, en)}</span></div>
                  <div className="sub">{(r.user_role ? r.user_role + ' · ' : '') + (en ? m.enShort : m.idShort)}</div>
                </div>
                <div className="client-card-meta">
                  <div className="item"><div className="lbl">{en ? 'Data' : 'Data'}</div><div className="val">{entityLabel(r.table_name, en)}</div></div>
                  <div className="item"><div className="lbl">ID</div><div className="val" title={r.record_code ?? ''}>{r.record_code || '-'}</div></div>
                  <div className="item"><div className="lbl">Record</div><div className="val" title={r.record_label ?? ''}>{r.record_label && r.record_label !== r.record_code ? r.record_label : '-'}</div></div>
                  <div className="item"><div className="lbl">{en ? 'Time' : 'Waktu'}</div><div className="val">{fmtDateTime(r.created_at, en)}</div></div>
                </div>
                <div className="client-card-actions">
                  <button type="button" className="btn-action-icon btn-edit btn-xs" onClick={() => setDetail(r)} title={en ? 'Detail' : 'Detail'}><i className="fi fi-rr-eye" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {detail && (
        <FullModal title="Detail Aktivitas" icon="fi fi-rr-time-past" onClose={() => setDetail(null)}
          footer={<button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>Tutup</button>}>
          <div className="dv2-card" data-no-i18n style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
              {[
                [en ? 'User' : 'User', `${detail.user_name || 'System'}${detail.user_role ? ` (${detail.user_role})` : ''}`],
                [en ? 'Action' : 'Aksi', en ? ACTION_META[detail.action].enShort : ACTION_META[detail.action].idShort],
                [en ? 'Data' : 'Data', entityLabel(detail.table_name, en)],
                ['ID', detail.record_code || '-'],
                ['Record', recordText(detail) || '-'],
                [en ? 'Time' : 'Waktu', fmtDateTime(detail.created_at, en)],
                ['UUID', detail.record_id || '-'],
              ].map(([k, v]) => (
                <div key={k}><div style={{ fontSize: 10, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>{v}</div></div>
              ))}
            </div>
            {detail.action === 'update' && changes.length > 0 && (
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead><tr style={{ textAlign: 'left', color: '#9ca3af', fontSize: 10, textTransform: 'uppercase' }}><th style={{ padding: '6px 8px' }}>{en ? 'Field' : 'Kolom'}</th><th style={{ padding: '6px 8px' }}>{en ? 'Before' : 'Sebelum'}</th><th style={{ padding: '6px 8px' }}>{en ? 'After' : 'Sesudah'}</th></tr></thead>
                <tbody>
                  {changes.map(([k, v]) => {
                    const c = v as { old?: unknown; new?: unknown };
                    return (
                      <tr key={k} style={{ borderTop: '1px solid #eef1f6' }}>
                        <td style={{ padding: '7px 8px', fontWeight: 700 }}>{k}</td>
                        <td style={{ padding: '7px 8px', color: '#dc2626', wordBreak: 'break-word' }}>{show(c.old)}</td>
                        <td style={{ padding: '7px 8px', color: '#16a34a', wordBreak: 'break-word' }}>{show(c.new)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {detail.action === 'delete' && changes.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 }}>{en ? 'Deleted data' : 'Data yang dihapus'}</div>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <tbody>
                    {changes.map(([k, v]) => (
                      <tr key={k} style={{ borderTop: '1px solid #eef1f6' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700, width: '35%' }}>{k}</td>
                        <td style={{ padding: '6px 8px', wordBreak: 'break-word' }}>{show(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </FullModal>
      )}
    </RegistryCard>
  );
}
