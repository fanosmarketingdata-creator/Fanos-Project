// Badge status (dv2Badge() / .badge-* di index.html).
export default function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status || 'DRAFT';
  const cls = s.replace(/[^a-zA-Z]+/g, '-').toLowerCase();
  return <span className={`badge badge-${cls}`}>{s}</span>;
}
