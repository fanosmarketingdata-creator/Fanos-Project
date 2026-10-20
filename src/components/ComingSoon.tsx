export default function ComingSoon({ title, icon }: { title: string; icon: string }) {
  return (
    <div>
      <h1 className="page-title"><i className={icon} />{title}</h1>
      <div className="dv2-empty" style={{ marginTop: 24 }}>
        <i className="fi fi-rr-time-quarter-past" style={{ fontSize: 34, color: '#c7cad1' }} />
        <div style={{ marginTop: 10, fontWeight: 700, color: '#6b7280' }}>Halaman ini sedang dalam pengembangan.</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Menu sudah tersedia; fitur akan ditambahkan pada pembaruan berikutnya.</div>
      </div>
    </div>
  );
}
