'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageHead } from '@/components/shell/page-head';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
} from '@/components/ui';
import { UserAvatar } from '@/components/user-avatar';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/providers/auth-provider';

export default function ProfilePage(): JSX.Element {
  const t = useTranslations('profile');
  const ts = useTranslations('shell');
  const { user, logout } = useAuth();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace('/login');
  };

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('accountCard')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={user?.name ?? '?'}
                role={user?.roleName}
                className="h-16 w-16 text-h3"
              />
              <div className="min-w-0">
                <p className="truncate text-h3 font-semibold text-neutral-900">{user?.name}</p>
                <p className="font-mono text-body-sm text-neutral-500">@{user?.username}</p>
                <Badge variant="slate" className="mt-1.5">
                  {user?.roleName}
                </Badge>
              </div>
            </div>

            <dl className="grid gap-4 border-t border-neutral-200 pt-5 sm:grid-cols-2">
              <div>
                <dt className="text-label text-neutral-500">{t('name')}</dt>
                <dd className="mt-0.5 text-body text-neutral-900">{user?.name}</dd>
              </div>
              <div>
                <dt className="text-label text-neutral-500">{t('username')}</dt>
                <dd className="mt-0.5 font-mono text-body text-neutral-900">@{user?.username}</dd>
              </div>
              <div>
                <dt className="text-label text-neutral-500">{t('role')}</dt>
                <dd className="mt-0.5 text-body text-neutral-900">{user?.roleName}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Security + session */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('securityCard')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-body-sm text-neutral-500">{t('securityBody')}</p>
              <Button variant="secondary" onClick={() => router.push('/change-password')}>
                {t('changePassword')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('sessionCard')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-body-sm text-neutral-500">{t('sessionBody')}</p>
              <Button variant="destructive" onClick={() => setConfirmLogout(true)}>
                {t('logout')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title={ts('logoutConfirmTitle')}
        description={ts('logoutConfirmBody')}
        confirmLabel={ts('logout')}
        onConfirm={() => void onLogout()}
      />
    </>
  );
}
