import { type ReactNode } from 'react';

import { Toaster } from '@/components/ui';
import { AuthProvider } from '@/providers/auth-provider';

/** Unauthenticated layout (login, forced password change) — no app shell. */
export default function AuthLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-neutral-50">{children}</div>
      <Toaster />
    </AuthProvider>
  );
}
