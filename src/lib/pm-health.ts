// Kesehatan project (dipakai Project Management dan KPI Dashboard).
export type PmHealth = 'track' | 'risk' | 'overdue' | 'done' | 'hold';

export function pmHealth(
  p: { status: string; end_date: string | null; total: number; done: number; overdueTasks: number },
  today: string
): PmHealth {
  if (p.status === 'Completed') return 'done';
  if (p.status === 'On Hold') return 'hold';
  if (p.end_date && p.end_date < today) return 'overdue';
  if (p.overdueTasks > 0) return 'risk';
  if (p.end_date) {
    const days = (new Date(p.end_date + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000;
    const pr = p.total ? p.done / p.total : 0;
    if (days <= 7 && pr < 0.7) return 'risk';
  }
  return 'track';
}
