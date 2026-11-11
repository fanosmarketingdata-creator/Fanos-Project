'use client';

import { useEffect, useState } from 'react';
import FvSelect, { toOptions } from '@/components/registry/FvSelect';
import { createClient } from '@/lib/supabase/client';

// Pilihan Client Category (dari menu Clients > Client Category).
export default function ClientCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    createClient()
      .from('client_categories')
      .select('name')
      .order('name')
      .then(({ data }) => setList((data ?? []).map((c) => c.name as string)));
  }, []);
  const opts = value && !list.includes(value) ? [...list, value] : list;
  return <FvSelect value={value} onChange={onChange} options={toOptions(opts)} placeholder={list.length ? 'Pilih category' : 'Belum ada category'} />;
}
