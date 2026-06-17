'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense } from 'react';

import { PageHead } from '@/components/shell/page-head';
import { QuickEntryBoard } from '@/components/transactions/quick-entry-board';
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type RouteCategory } from '@/lib/types/transactions';

interface RecordTab {
  /** URL `?tab=` value + Radix tab value. */
  readonly value: string;
  /** Translation key under the `nav` namespace. */
  readonly labelKey: string;
  readonly categories: readonly RouteCategory[];
  readonly allowAdHoc: boolean;
}

/**
 * Tabs of the single "Pencatatan Aktivitas" screen (legacy parity for the
 * per-role transaksi menus: pengambilansampah / pembuangansampah /
 * pengisianbahanbakar / aktivitaspool). Pool legs are auto-created from the
 * schedule, so they offer no ad-hoc add.
 */
const DEFAULT_TAB = 'pickup';

const TABS: readonly RecordTab[] = [
  { value: 'pickup', labelKey: 'recordPickup', categories: ['PICKUP'], allowAdHoc: true },
  { value: 'disposal', labelKey: 'recordDisposal', categories: ['DISPOSAL'], allowAdHoc: true },
  { value: 'refuel', labelKey: 'recordRefuel', categories: ['REFUEL'], allowAdHoc: true },
  {
    value: 'pool',
    labelKey: 'recordPool',
    categories: ['DEPART_POOL', 'RETURN_POOL'],
    allowAdHoc: false,
  },
];

function RecordTabs(): JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const requested = params.get('tab');
  const active = TABS.some((tab) => tab.value === requested) ? (requested as string) : DEFAULT_TAB;

  const onChange = (value: string): void => {
    router.replace({ pathname, query: { tab: value } });
  };

  return (
    <>
      <PageHead
        title={t('recordActivity')}
        description="Pilih aktivitas dan kendaraan, lalu catat kegiatan operasional hari ini."
      />

      <Tabs value={active} onValueChange={onChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <QuickEntryBoard categories={tab.categories} allowAdHoc={tab.allowAdHoc} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

export default function RecordPage(): JSX.Element {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <RecordTabs />
    </Suspense>
  );
}
