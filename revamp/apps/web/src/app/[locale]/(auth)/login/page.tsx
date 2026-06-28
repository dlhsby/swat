'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button, Input, Label, PasswordInput, notify } from '@/components/ui';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-error';
import { login } from '@/lib/auth-api';
import { useAuth } from '@/providers/auth-provider';

export default function LoginPage(): JSX.Element {
  const t = useTranslations('auth');
  const { status, user, refresh } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Standard error handling: field-specific validation shows inline under the
  // field; submit-level failures (bad credentials) surface as a toast.
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const clearFieldError = (field: 'username' | 'password'): void =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  // Already signed in → leave the login screen.
  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(user.mustChangePassword ? '/change-password' : '/dashboard');
    }
  }, [status, user, router]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    // Field-level validation → inline messages (not a toast).
    const nextErrors: { username?: string; password?: string } = {};
    if (!username.trim()) nextErrors.username = t('usernameRequired');
    if (!password) nextErrors.password = t('passwordRequired');
    setFieldErrors(nextErrors);
    if (nextErrors.username ?? nextErrors.password) {
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      const me = await refresh();
      router.replace(me?.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err) {
      // Submit-level failure (ambiguous which field) → toast.
      notify.error(err instanceof ApiError ? err.message : t('invalidCredentials'));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('loginHeading')}
      subtitle={t('loginHelp')}
      illustration={{ name: 'login', size: 232 }}
      footer={t('copyright')}
    >
      <form
        onSubmit={(e) => void onSubmit(e)}
        noValidate
        className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-base"
      >
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
              onChange={(e) => {
                setUsername(e.target.value);
                clearFieldError('username');
              }}
              placeholder={t('usernamePlaceholder')}
              error={Boolean(fieldErrors.username)}
            />
            {fieldErrors.username ? (
              <p className="text-tiny text-danger-600">{fieldErrors.username}</p>
            ) : null}
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
              onChange={(e) => {
                setPassword(e.target.value);
                clearFieldError('password');
              }}
              placeholder={t('passwordPlaceholder')}
              error={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="text-tiny text-danger-600">{fieldErrors.password}</p>
            ) : null}
          </div>
        </div>

        <Button type="submit" className="mt-6 w-full" loading={submitting}>
          {submitting ? t('submitting') : t('submit')}
        </Button>

        <p className="mt-3.5 text-center text-[12.5px]">
          <Link
            href="/forgot-password"
            className="text-primary-700 hover:underline"
            title={t('forgotPasswordHelp')}
          >
            {t('forgotPassword')}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
