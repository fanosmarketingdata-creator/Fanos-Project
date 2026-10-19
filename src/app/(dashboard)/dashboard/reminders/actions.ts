'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ReminderInput = {
  id?: string;
  title: string;
  due_date: string;
  notes?: string;
};

export async function saveReminder(input: ReminderInput) {
  if (!input.title?.trim()) return { error: 'Kolom Judul wajib diisi.' };
  if (!input.due_date) return { error: 'Kolom Tanggal jatuh tempo wajib diisi.' };

  const supabase = createClient();
  const payload = {
    title: input.title.trim(),
    due_date: input.due_date,
    notes: input.notes || null,
  };

  if (input.id) {
    const { error } = await supabase.from('reminders').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from('reminders').insert({ ...payload, created_by: user?.id ?? null });
    if (error) return { error: error.message };
  }

  revalidatePath('/dashboard/reminders');
  return { success: true };
}

export async function toggleReminderDone(id: string, isDone: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from('reminders').update({ is_done: !isDone }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/reminders');
  return { success: true };
}

export async function deleteReminder(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/reminders');
  return { success: true };
}
