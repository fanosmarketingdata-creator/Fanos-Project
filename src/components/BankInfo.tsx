'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Pilihan rekening diambil dari master Finance → Payment Method (yang berisi data rekening).
export type BankOption = { id: string; name: string; bank_name: string | null; account_no: string | null; account_holder: string | null; account_note: string | null };
const NONE = 'none';

type Ctx = { enabled: boolean; options: BankOption[]; loaded: boolean; bankId: string; setBankId: (v: string) => void };
const BankCtx = createContext<Ctx>({ enabled: true, options: [], loaded: false, bankId: '', setBankId: () => {} });

export function BankProvider({ children, enabled = true, storageKey, defaultNone = false }: { children: React.ReactNode; enabled?: boolean; storageKey?: string; defaultNone?: boolean }) {
  const KEY = storageKey ? `fanos-print-bank-${storageKey}` : 'fanos-print-bank';
  const [options, setOptions] = useState<BankOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [bankId, setBankIdState] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      let saved = '';
      try { saved = localStorage.getItem(KEY) ?? ''; } catch {}
      try {
        const { data } = await createClient().from('finance_options').select('*').eq('kind', 'payment_method').order('name');
        const list = ((data ?? []) as BankOption[]).filter((o) => o.account_no || o.bank_name || o.account_holder || o.account_note);
        if (!alive) return;
        setOptions(list);
        setBankIdState(saved === NONE || list.some((o) => o.id === saved) ? saved : (defaultNone ? NONE : (list[0]?.id ?? NONE)));
      } catch {
        if (alive) setBankIdState(NONE);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, [enabled]);
  const setBankId = (v: string) => {
    setBankIdState(v);
    try { localStorage.setItem(KEY, v); } catch {}
  };
  return <BankCtx.Provider value={{ enabled, options, loaded, bankId, setBankId }}>{children}</BankCtx.Provider>;
}

// Dropdown pilihan rekening (di footer modal cetak).
export function BankSelect() {
  const { options, bankId, setBankId, loaded } = useContext(BankCtx);
  return (
    <label className="print-bank-select" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <span style={{ color: '#6b7280' }}>Rekening</span>
      <select className="input" style={{ height: 34, minWidth: 250 }} value={bankId} onChange={(e) => setBankId(e.target.value)} disabled={!loaded}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        <option value={NONE}>Tanpa rekening</option>
      </select>
    </label>
  );
}

// Blok info pembayaran di dalam kertas.
export default function BankInfo({ className }: { className?: string }) {
  const { enabled, options, bankId } = useContext(BankCtx);
  if (!enabled || bankId === NONE) return null;
  const b = options.find((o) => o.id === bankId);
  if (!b) return null;
  return (
    <div className={className} data-no-i18n style={{ marginTop: 10, fontSize: 10.5, lineHeight: 1.5, breakInside: 'avoid', color: '#000' }}>
      <div style={{ fontWeight: 700 }}>Pembayaran ditransfer ke:</div>
      {b.bank_name && <div>{b.bank_name}</div>}
      {b.account_no && <div>No. Rekening : <b>{b.account_no}</b></div>}
      {b.account_holder && <div>a/n : <b>{b.account_holder}</b></div>}
      {b.account_note && <div style={{ whiteSpace: 'pre-line' }}>{b.account_note}</div>}
    </div>
  );
}
