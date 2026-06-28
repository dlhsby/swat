'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useState } from 'react';

import { PageHead } from '@/components/shell/page-head';
import { QuickEntryBoard } from '@/components/transactions/quick-entry-board';
import {
  DatePicker,
  Label,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { usePathname, useRouter } from '@/i18n/navigation';
import { todayWIB } from '@/lib/dates';
import { type RouteCategory } from '@/lib/types/transactions';

interface RecordTab {
  /** URL `?tab=` value + Radix tab value. */
  readonly value: string;
  /** Translation key under the `nav` namespace. */
  readonly labelKey: string;
  readonly categories: readonly RouteCategory[];
}

/**
 * Tabs of the single "Pencatatan Aktivitas" screen (legacy parity for the
 * per-role transaksi menus). Order mirrors the operational flow:
 * pool → refuel → pickup → disposal.
 */
const DEFAULT_TAB = 'pool';

const TABS: readonly RecordTab[] = [
  { value: 'pool', labelKey: 'recordPool', categories: ['DEPART_POOL', 'RETURN_POOL'] },
  { value: 'refuel', labelKey: 'recordRefuel', categories: ['REFUEL'] },
  { value: 'pickup', labelKey: 'recordPickup', categories: ['PICKUP'] },
  { value: 'disposal', labelKey: 'recordDisposal', categories: ['DISPOSAL'] },
];

function RecordTabs(): JSX.Element {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const requested = params.get('tab');
  const active = TABS.some((tab) => tab.value === requested) ? (requested as string) : DEFAULT_TAB;
  // Shared across tabs: which day's activities to view/record (defaults to today,
  // so view-only roles can review previous days too).
  const [date, setDate] = useState(todayWIB());

  const onChange = (value: string): void => {
    router.replace({ pathname, query: { tab: value } });
  };

  return (
    <>
      <PageHead
        title={t('recordActivity')}
        description="Catat aktivitas memakai Waktu Realisasi pada formulir; rekap di bawah difilter per tanggal."
        actions={
          <div className="flex items-center gap-2">
            <Label className="text-body-sm text-neutral-500">Rekap tanggal</Label>
            <div className="w-44">
              <DatePicker value={date} onValueChange={(v) => v && setDate(v)} disableFuture />
            </div>
          </div>
        }
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
            <QuickEntryBoard categories={tab.categories} date={date} onDateChange={setDate} />
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
