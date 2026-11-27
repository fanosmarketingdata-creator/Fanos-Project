// Tanggal lokal (zona waktu perangkat/WIB), bukan UTC. toISOString() memakai UTC sehingga
// antara 00:00–07:00 WIB hasilnya masih tanggal kemarin.
export function localDateStr(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const todayLocal = () => localDateStr();
// Untuk kode server (Vercel berjalan di UTC): paksa zona Asia/Jakarta.
export function todayWIB(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
