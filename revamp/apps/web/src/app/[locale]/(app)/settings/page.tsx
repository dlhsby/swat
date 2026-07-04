'use client';

import { useTranslations } from 'next-intl';

import { PersonalSettingsSection } from '@/components/settings/personal-settings-section';
import { SystemConfigSection } from '@/components/settings/system-config-section';
import { PageHead } from '@/components/shell/page-head';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';

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

        <TabsContent value="personal">
          <PersonalSettingsSection />
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
