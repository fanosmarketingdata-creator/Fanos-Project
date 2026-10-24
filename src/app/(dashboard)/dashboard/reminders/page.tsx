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
      <RemindersList initialRows={reminders ?? []} />
    </div>
  );
}
