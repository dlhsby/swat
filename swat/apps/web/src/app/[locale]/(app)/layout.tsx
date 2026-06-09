import { type ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { AppShell } from '@/components/shell/app-shell';
import { Toaster } from '@/components/ui';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';

/** Authenticated app layout — session guard + shell + query cache. */
export default function AppLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <AuthProvider>
      <QueryProvider>
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </QueryProvider>
      <Toaster />
    </AuthProvider>
  );
}
