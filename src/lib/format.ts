export function rupiah(n: number | string | null | undefined) {
  return `Rp ${Number(n ?? 0).toLocaleString('id-ID')}`;
}

export function num(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString('id-ID');
}

export function dateShort(d: string | Date | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
