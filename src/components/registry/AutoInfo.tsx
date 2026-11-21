// Baris info untuk data yang terisi otomatis (bukan inputan): mis. Client/Vendor dari dokumen sumber.
export default function AutoInfo({ label, value, placeholder, icon = 'fi fi-rr-user' }: { label: string; value?: string | null; placeholder: string; icon?: string }) {
  return (
    <div className="so-client-auto" style={{ gridColumn: '1 / -1' }}>
      <i className={icon} />
      <span className="so-client-label">{label}</span>
      {value ? <strong>{value}</strong> : null}
    </div>
  );
}
