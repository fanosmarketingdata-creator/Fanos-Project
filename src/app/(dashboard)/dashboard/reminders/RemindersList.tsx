'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { saveReminder, deleteReminder, toggleReminderDone, type ReminderInput } from './actions';

export type ReminderRow = {
  id: string;
  title: string;
  due_date: string;
  notes: string | null;
  is_done: boolean;
};

const emptyForm = (): ReminderInput => ({ title: '', due_date: new Date().toISOString().split('T')[0], notes: '' });

export default function RemindersList({ initialRows }: { initialRows: ReminderRow[] }) {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ReminderInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReminderRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  function openAdd() {
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(r: ReminderRow) {
    setForm({ id: r.id, title: r.title, due_date: r.due_date, notes: r.notes || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveReminder(form);
    setSaving(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast(form.id ? 'Reminder diperbarui' : 'Reminder ditambahkan', 'success');
    setModalOpen(false);
  }

  async function handleToggle(r: ReminderRow) {
    const result = await toggleReminderDone(r.id, r.is_done);
    if (result.error) toast(result.error, 'error');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteReminder(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast(result.error, 'error');
      return;
    }
    toast('Reminder dihapus', 'success');
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={openAdd}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          + Tambah Reminder
        </button>
      </div>

      <div className="space-y-2">
        {initialRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">
            Belum ada reminder
          </div>
        )}
        {initialRows.map((r) => {
          const overdue = !r.is_done && r.due_date < today;
          const dueToday = !r.is_done && r.due_date === today;
          return (
            <div
              key={r.id}
              className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${
                overdue ? 'border-red-200' : dueToday ? 'border-amber-200' : 'border-slate-200'
              } ${r.is_done ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                checked={r.is_done}
                onChange={() => handleToggle(r)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-brand-500"
              />
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${r.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {r.title}
                </div>
                {r.notes && <div className="mt-0.5 truncate text-xs text-slate-500">{r.notes}</div>}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  overdue
                    ? 'bg-red-100 text-red-700'
                    : dueToday
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {overdue ? 'Terlambat · ' : dueToday ? 'Hari ini · ' : ''}
                {new Date(r.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => openEdit(r)}
                  className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(r)}
                  className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <Modal
          title={form.id ? 'Edit Reminder' : 'Tambah Reminder'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Judul *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Jatuh Tempo *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Catatan</label>
              <textarea
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Hapus Reminder"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Yakin ingin menghapus reminder <strong>{deleteTarget.title}</strong>?
          </p>
        </Modal>
      )}
    </div>
  );
}
