'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { Alert, Button, Label, Input, notify } from '@/components/ui';
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

  const strength = scorePassword(next);
  const confirmMismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    current.length > 0 && strength.meetsRequirements && confirm === next && confirm.length > 0;
  const forced = Boolean(user?.mustChangePassword);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await changePassword({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
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
          <div className="space-y-1.5">
            <Label htmlFor="current" required>
              {t('currentPassword')}
            </Label>
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="next" required>
              {t('newPassword')}
            </Label>
            <Input
              id="next"
              type="password"
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
            <Input
              id="confirm"
              type="password"
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
