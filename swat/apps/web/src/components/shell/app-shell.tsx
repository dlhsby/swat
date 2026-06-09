'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { SidebarNav } from '@/components/shell/sidebar';
import { SidebarContext } from '@/components/shell/sidebar-context';
import { Topbar } from '@/components/shell/topbar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui';

/** Collapsible groups all start closed; the user expands what they need. */
const DEFAULT_EXPANDED: readonly string[] = [];

/** Application shell — topbar, role-driven sidebar, recessed content canvas. */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const t = useTranslations('shell');
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(DEFAULT_EXPANDED),
  );

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const ctx = useMemo(
    () => ({ open, setOpen, expandedGroups, toggleGroup }),
    [open, expandedGroups, toggleGroup],
  );

  return (
    <SidebarContext.Provider value={ctx}>
      <div className="flex h-screen flex-col overflow-hidden">
        <Topbar />
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50 lg:block">
            <SidebarNav />
          </aside>
          <main className="flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-50">
            <div className="mx-auto max-w-[1400px] px-6 py-6 xl:px-8 xl:py-8">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile off-canvas drawer (< lg). */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[264px] bg-neutral-50 p-0">
          <SheetTitle className="sr-only">{t('userMenu')}</SheetTitle>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </SidebarContext.Provider>
  );
}
