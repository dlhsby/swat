'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Alert, Button, Input, Label, PasswordInput } from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-error';
import { login } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

export default function LoginPage(): JSX.Element {
  const t = useTranslations('auth');
  const { status, user, refresh } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → leave the login screen.
  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(user.mustChangePassword ? '/change-password' : '/dashboard');
    }
  }, [status, user, router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t('bothRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      const me = await refresh();
      router.replace(me?.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('invalidCredentials'));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="SWAT"
      subtitle={t('brandSubtitle')}
      illustration={{ name: 'login', size: 232 }}
      footer={t('copyright')}
    >
      <form
        onSubmit={(e) => void onSubmit(e)}
        noValidate
        className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-base"
      >
        <h1 className="text-[20px] font-bold text-neutral-900">{t('loginHeading')}</h1>
        <p className="mb-[18px] mt-1 text-[13px] text-neutral-500">{t('loginHelp')}</p>

        {error ? (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" required>
              {t('username')}
            </Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              error={Boolean(error)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" required>
              {t('password')}
            </Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              error={Boolean(error)}
            />
          </div>
        </div>

        <Button type="submit" className="mt-6 w-full" loading={submitting}>
          {submitting ? t('submitting') : t('submit')}
        </Button>

        <p className="mt-3.5 text-center text-[12.5px]">
          <button
            type="button"
            className="text-primary-700 hover:underline"
            title={t('forgotPasswordHelp')}
          >
            {t('forgotPassword')}
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
