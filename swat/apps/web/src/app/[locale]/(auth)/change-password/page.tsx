'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Alert, Button, Label, PasswordInput, Spinner, notify } from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api-error';
import { changePassword } from '@/lib/auth-api';
import { cn } from '@/lib/cn';
import { scorePassword } from '@/lib/password-strength';
import { useAuth } from '@/providers/auth-provider';

export default function ChangePasswordPage(): JSX.Element {
  const t = useTranslations('changePassword');
  const { status, user, refresh, logout } = useAuth();
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  // Wait for auth to resolve before rendering the form: until `/auth/me` loads,
  // `user` is null so `forced` would be false and the current-password field
  // would briefly show on a forced change. Render a placeholder meanwhile.
  if (status === 'loading') {
    return (
      <AuthShell width={440} title={t('title')} subtitle={t('subtitle')}>
        <div className="flex justify-center rounded-lg border border-neutral-200 bg-neutral-0 p-10 shadow-base">
          <Spinner aria-label={t('title')} />
        </div>
      </AuthShell>
    );
  }

  const strength = scorePassword(next);
  const confirmMismatch = confirm.length > 0 && confirm !== next;
  const forced = Boolean(user?.mustChangePassword);
  // A forced first-login change only needs the new password — the current one
  // was just entered at login. Voluntary changes still require it.
  const canSubmit =
    (forced || current.length > 0) &&
    strength.meetsRequirements &&
    confirm === next &&
    confirm.length > 0;

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await changePassword({
        newPassword: next,
        confirmPassword: confirm,
        ...(forced ? {} : { currentPassword: current }),
      });
      notify.success(t('success'));
      await refresh();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('tooWeak'));
      setSubmitting(false);
    }
  };

  // Escape hatch: a stale/forced session can land here with no way back to login.
  const onSignOut = async (): Promise<void> => {
    await logout();
    router.replace('/login');
  };

  return (
    <AuthShell
      width={440}
      title={forced ? t('forcedTitle') : t('title')}
      subtitle={forced ? t('forcedSubtitle') : t('subtitle')}
    >
      {forced ? (
        <Alert variant="warning" className="mb-3.5">
          {t('forcedNotice')}
        </Alert>
      ) : null}

      <form
        onSubmit={(e) => void onSubmit(e)}
        noValidate
        className="rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-base"
      >
        {error ? (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}

        <div className="space-y-4">
          {forced ? null : (
            <div className="space-y-1.5">
              <Label htmlFor="current" required>
                {t('currentPassword')}
              </Label>
              <PasswordInput
                id="current"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="next" required>
              {t('newPassword')}
            </Label>
            <PasswordInput
              id="next"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            {/* Five-segment strength meter (danger → success). */}
            <div className="flex gap-1 pt-1" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i < strength.filled ? strength.colorClass : 'bg-neutral-200',
                  )}
                />
              ))}
            </div>
            <p className="text-tiny text-neutral-500">
              {t('strength')}: <span className="font-medium">{t(strength.labelKey)}</span>
            </p>
            <p className="text-tiny text-neutral-400">{t('requirements')}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" required>
              {t('confirmPassword')}
            </Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirmMismatch}
            />
            {confirmMismatch ? <p className="text-tiny text-danger-600">{t('mismatch')}</p> : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => (forced ? void onSignOut() : router.replace('/dashboard'))}
          >
            {forced ? t('signOut') : t('cancel')}
          </Button>
          <Button type="submit" loading={submitting} disabled={!canSubmit}>
            {forced ? t('submitForced') : t('submit')}
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
