import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f8fc', padding: 16, textAlign: 'center' }}>
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 56, fontWeight: 800, color: '#3563e9', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '10px 0 6px' }}>Halaman tidak ditemukan</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Alamat yang Anda buka tidak tersedia.</p>
        <Link href="/dashboard" style={{ display: 'inline-block', background: '#3563e9', color: '#fff', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14 }}>Ke Dashboard</Link>
      </div>
    </div>
  );
}
