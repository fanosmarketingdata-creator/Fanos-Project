import { createClient } from '@/lib/supabase/server';
import RemindersList from './RemindersList';

export default async function RemindersPage() {
  const supabase = createClient();
  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, title, due_date, notes, is_done')
    .order('is_done', { ascending: true })
    .order('due_date', { ascending: true });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-slate-800">Reminders</h1>
      <p className="mb-6 text-sm text-slate-500">Pengingat tugas & tenggat waktu.</p>
      <RemindersList initialRows={reminders ?? []} />
    </div>
  );
}
