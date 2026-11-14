import PageSkeleton from '@/components/PageSkeleton';

// Cadangan untuk semua halaman dashboard yang belum punya loading.tsx sendiri.
export default function Loading() {
  return <PageSkeleton variant="list" />;
}
