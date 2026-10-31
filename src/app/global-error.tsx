'use client';

// Cadangan terakhir bila layout utama sendiri gagal. Harus membawa <html> dan <body> sendiri.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f6f8fc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, textAlign: 'center' }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Terjadi kesalahan</h1>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Aplikasi gagal dimuat. Silakan coba lagi.</p>
            <button type="button" onClick={reset} style={{ background: '#3563e9', color: '#fff', border: 0, borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Coba lagi</button>
            {error.digest && <p style={{ marginTop: 16, fontSize: 11, color: '#94a3b8' }}>Kode error: {error.digest}</p>}
          </div>
        </div>
      </body>
    </html>
  );
}
