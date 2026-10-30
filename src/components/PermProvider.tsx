'use client';

import { createContext, useContext } from 'react';

// Izin Create/Edit/Delete untuk menu yang sedang dibuka (diatur di Role Group).
export type PagePerm = { create: boolean; edit: boolean; delete: boolean };
const PermContext = createContext<PagePerm>({ create: true, edit: true, delete: true });

export function PermProvider({ value, children }: { value: PagePerm; children: React.ReactNode }) {
  return <PermContext.Provider value={value}>{children}</PermContext.Provider>;
}
export const usePagePerm = () => useContext(PermContext);
