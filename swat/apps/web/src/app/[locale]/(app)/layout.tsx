import { type ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { AppShell } from '@/components/shell/app-shell';
import { Toaster } from '@/components/ui';
import { AuthProvider } from '@/providers/auth-provider';

/** Authenticated app layout — session guard + shell. */
export default function AppLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
      <Toaster />
    </AuthProvider>
  );
}
