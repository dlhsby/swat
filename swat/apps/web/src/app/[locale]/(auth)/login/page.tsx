'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';

import { Illustration } from '@/components/illustrations/Illustration';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Alert, Button, Input, Label } from '@/components/ui';
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
      router.replace(user.mustChangePassword ? '/ubah-kata-sandi' : '/dasbor');
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
      router.replace(me?.mustChangePassword ? '/ubah-kata-sandi' : '/dasbor');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('invalidCredentials'));
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* Faint emerald radial glow behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,theme(colors.primary.100),transparent)] opacity-60"
      />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative flex w-full max-w-[400px] flex-col items-center">
        <Illustration name="login" size={120} className="mb-2" />
        <div className="mb-6 text-center">
          <h1 className="text-h2 font-bold text-neutral-900">{t('loginTitle')}</h1>
          <p className="mt-1 text-body-sm text-neutral-500">{t('loginSubtitle')}</p>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          noValidate
          className="w-full rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-base"
        >
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
              <Input
                id="password"
                name="password"
                type="password"
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

          <p
            className="mt-4 text-center text-body-sm text-neutral-500"
            title={t('forgotPasswordHelp')}
          >
            {t('forgotPassword')}
          </p>
        </form>
      </div>
    </main>
  );
}
