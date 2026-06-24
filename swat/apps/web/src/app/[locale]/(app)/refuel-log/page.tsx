'use client';

import { useTranslations } from 'next-intl';

import { RefuelLogPanel } from '@/components/monitoring/refuel-log-panel';
import { PageHead } from '@/components/shell/page-head';

/**
 * Standalone refuel ledger route — kept for deep links. The same {@link RefuelLogPanel}
 * is also embedded as the "Riwayat Pengisian" tab under Konsumsi BBM monitoring.
 */
export default function RefuelLogPage(): JSX.Element {
  const t = useTranslations('nav');
  return (
    <>
      <PageHead title={t('refuelLog')} description="Riwayat pengisian BBM dengan estimasi biaya." />
      <RefuelLogPanel />
    </>
  );
}
