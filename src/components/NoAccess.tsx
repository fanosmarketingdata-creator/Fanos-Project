export default function NoAccess() {
  return (
    <div className="dv2-empty" style={{ marginTop: 40 }}>
      <i className="fi fi-rr-lock" style={{ fontSize: 38, color: '#c7cad1' }} />
      <div style={{ marginTop: 10, fontWeight: 700, color: '#6b7280' }}>Anda tidak memiliki akses ke menu ini.</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>Hubungi Superuser apabila Anda memerlukan akses.</div>
    </div>
  );
}
