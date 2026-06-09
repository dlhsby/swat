'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect } from 'react';

import { Spinner } from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/providers/auth-provider';

function FullScreenLoader({ label }: { label: string }): JSX.Element {
  return (
    <div className="flex h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-50">
      <span className="flex items-center gap-2 text-body-sm text-neutral-500">
        <Spinner aria-hidden />
        {label}
      </span>
    </div>
  );
}

/**
 * Client-side route guard for the authenticated app. Redirects unauthenticated
 * users to the login screen and users who must change their password to the
 * forced-change screen. The server session remains the authoritative gate.
 */
export function AuthGuard({ children }: { children: ReactNode }): JSX.Element {
  const tc = useTranslations('common');
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && user?.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [status, user, router]);

  if (status !== 'authenticated' || user?.mustChangePassword) {
    return <FullScreenLoader label={tc('loading')} />;
  }

  return <>{children}</>;
}
