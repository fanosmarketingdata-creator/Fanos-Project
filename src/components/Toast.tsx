'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastKind = 'success' | 'error';
type ToastItem = { id: number; message: string; kind: ToastKind; leaving: boolean };

const ToastContext = createContext<{ toast: (message: string, kind?: ToastKind) => void } | null>(null);

let idCounter = 0;

// Notifikasi bergaya "dynamic island": pil hitam di tengah atas yang membesar dari titik kecil,
// menampilkan ikon + pesan, lalu mengecil kembali. Notifikasi baru menggantikan yang sedang tampil.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const dismiss = useCallback((id: number) => {
    setItem((cur) => (cur && cur.id === id ? { ...cur, leaving: true } : cur));
    timers.current.push(setTimeout(() => setItem((cur) => (cur && cur.id === id ? null : cur)), 380));
  }, []);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    clear();
    const id = ++idCounter;
    setItem({ id, message, kind, leaving: false });
    timers.current.push(setTimeout(() => dismiss(id), kind === 'error' ? 5000 : 3000));
  }, [dismiss]);

  useEffect(() => clear, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="di-wrap" aria-live="polite">
        {item && (
          <button
            type="button"
            key={item.id}
            className={`di ${item.kind} ${item.leaving ? 'out' : ''}`}
            onClick={() => dismiss(item.id)}
            role="status"
          >
            <span className="di-ic" aria-hidden>
              {item.kind === 'success' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l10 10M17 7L7 17" /></svg>
              )}
            </span>
            <span className="di-msg">{item.message}</span>
          </button>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam <ToastProvider>');
  return ctx.toast;
}
