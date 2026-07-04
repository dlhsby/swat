'use client';

import { useTranslations } from 'next-intl';

import { AppearanceControl } from '@/components/settings/appearance-control';
import { LanguageControl } from '@/components/settings/language-control';
import { SystemConfigSection } from '@/components/settings/system-config-section';
import { PageHead } from '@/components/shell/page-head';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { APP_VERSION } from '@/lib/app-meta';

export default function SettingsPage(): JSX.Element {
  const t = useTranslations('settings');
  const { canAny } = usePermissions();
  const showSystem = canAny(['system-config:manage', 'deviation-rule:manage']);

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />

      <Tabs defaultValue="personal" className="space-y-5">
        <TabsList>
          <TabsTrigger value="personal">{t('tabPersonal')}</TabsTrigger>
          {showSystem ? <TabsTrigger value="system">{t('tabSystem')}</TabsTrigger> : null}
        </TabsList>

        {/* Personal preferences — max-w-[42rem] (not max-w-2xl): the custom spacing
            scale poisons the named max-w-* tokens, so use an arbitrary value. */}
        <TabsContent value="personal">
          <div className="max-w-[42rem] space-y-6">
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
        </TabsContent>

        {showSystem ? (
          <TabsContent value="system">
            <div className="space-y-3">
              <div>
                <h2 className="text-h3 text-neutral-900">{t('systemTitle')}</h2>
                <p className="text-body-sm text-neutral-500">{t('systemBody')}</p>
              </div>
              <SystemConfigSection />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </>
  );
}
