'use client';

import { useTranslations } from 'next-intl';

import { ProtectedAction } from '@/components/auth/protected-action';
import { AppearanceControl } from '@/components/settings/appearance-control';
import { DeviationRulesControl } from '@/components/settings/deviation-rules-control';
import { LanguageControl } from '@/components/settings/language-control';
import { PageHead } from '@/components/shell/page-head';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { APP_VERSION } from '@/lib/app-meta';

export default function SettingsPage(): JSX.Element {
  const t = useTranslations('settings');

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('appearance')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-body-sm text-neutral-500">{t('appearanceBody')}</p>
            <AppearanceControl />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('language')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-body-sm text-neutral-500">{t('languageBody')}</p>
            <LanguageControl />
          </CardContent>
        </Card>

        <ProtectedAction permission="deviation-rule:manage">
          <Card>
            <CardHeader>
              <CardTitle>{t('tracking')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-body-sm text-neutral-500">{t('trackingBody')}</p>
              <DeviationRulesControl />
            </CardContent>
          </Card>
        </ProtectedAction>

        <Card>
          <CardHeader>
            <CardTitle>{t('about')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-label text-neutral-500">{t('aboutApp')}</dt>
                <dd className="mt-0.5 text-body text-neutral-900">SWAT</dd>
              </div>
              <div>
                <dt className="text-label text-neutral-500">{t('aboutOrg')}</dt>
                <dd className="mt-0.5 text-body text-neutral-900">DLH Kota Surabaya</dd>
              </div>
              <div>
                <dt className="text-label text-neutral-500">{t('aboutVersion')}</dt>
                <dd className="mt-0.5 font-mono text-body text-neutral-900">{APP_VERSION}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
