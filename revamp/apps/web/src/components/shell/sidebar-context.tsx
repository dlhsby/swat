'use client';

import { createContext, useContext } from 'react';

export interface SidebarContextValue {
  /** Mobile drawer open state (< lg). */
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** Expanded collapsible nav groups (by group id). */
  readonly expandedGroups: ReadonlySet<string>;
  readonly toggleGroup: (id: string) => void;
}

export const SidebarContext = createContext<SidebarContextValue | null>(null);

/** Access the sidebar state shared across the shell (drawer + collapsible groups). */
export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within the app shell.');
  }
  return ctx;
}
