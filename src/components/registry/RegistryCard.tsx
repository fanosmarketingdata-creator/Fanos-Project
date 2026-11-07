'use client';

// Kerangka halaman registry seperti di index.html:
// card-header (judul + search + info + tombol New) lalu isi, lalu pagination.
export default function RegistryCard({
  title,
  icon,
  search,
  onSearch,
  info,
  addLabel,
  addIcon,
  onAdd,
  filters,
  extra,
  children,
  footer,
}: {
  title: string;
  icon: string;
  search: string;
  onSearch: (v: string) => void;
  info?: string;
  addLabel?: string;
  addIcon?: string;
  onAdd?: () => void;
  filters?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card reg-card">
      <div className="card-header">
        <h3>
          <i className={icon} style={{ fontSize: 16, color: '#2563eb' }} /> {title}
        </h3>
        <div className="flex-wrap">
          {filters}
          <div className="search-box">
            <span className="search-icon">
              <i className="fa-solid fa-search" />
            </span>
            <input type="text" placeholder="Cari..." value={search} onChange={(e) => onSearch(e.target.value)} />
          </div>
          {info && <span className="search-info">{info}</span>}
          {extra}
          {onAdd && (
            <button type="button" className="btn btn-primary" onClick={onAdd}>
              <i className={addIcon} /> {addLabel}
            </button>
          )}
        </div>
      </div>
      <div className="reg-body">{children}</div>
      {footer}
    </div>
  );
}
