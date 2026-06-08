'use client';

import { createContext, useContext } from 'react';

export interface SidebarContextValue {
  /** Mobile drawer open state. */
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

/** Access the mobile-drawer open state shared across the shell. */
export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within the app shell.');
  }
  return ctx;
}
