'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useCallback, useMemo } from 'react';
import { z } from 'zod';

import { CrudFormDialog } from '@/components/crud/crud-form-dialog';
import { CrudListShell } from '@/components/crud/crud-list-shell';
import { DateField, NumberField, TextField, TextareaField } from '@/components/crud/fields';
import { RowActions } from '@/components/crud/row-actions';
import { ChartCard } from '@/components/monitoring/chart-card';
import { LevyByCategory } from '@/components/monitoring/charts/levy-by-category';
import { LevyTrend } from '@/components/monitoring/charts/levy-trend';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { ExportMenu } from '@/components/monitoring/export-menu';
import { PageHead } from '@/components/shell/page-head';
import {
  EmptyState,
  MetricCard,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useLevySummary, useLevyTrend } from '@/hooks/use-monitoring';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { type ServerQueryParams } from '@/hooks/use-server-resource-list';
import { useServerResourceManager } from '@/hooks/use-server-resource-manager';
import { formatDateDisplay, formatRupiah } from '@/lib/format';
import { type LevyDto, levyApi } from '@/lib/levy-api';
import { levyByCategory, levyTrendPoints } from '@/lib/monitoring-charts';

/* ----------------------------- Ringkasan tab ----------------------------- */

/** Wrap a chart in its loading / empty / data states. */
function ChartState({
  loading,
  error,
  isEmpty,
  emptyLabel,
  children,
}: {
  loading: boolean;
  error: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  children: ReactNode;
}): JSX.Element {
  if (loading) {
    return <Skeleton className="h-[280px]" />;
  }
  if (error || isEmpty) {
    return (
      <EmptyState
        illustration="no-results"
        title={error ? 'Gagal memuat data' : emptyLabel}
        description={error ? 'Coba muat ulang halaman.' : undefined}
      />
    );
  }
  return <>{children}</>;
}

function SummaryTab(): JSX.Element {
  const t = useTranslations('monitoring.levy');
  // Levy is recorded monthly (first-of-month), so a 7-day window is usually
  // empty — default to year-to-date so the summary + trend have data.
  const { range, setRange, today } = useMonitoringRange('ytd');
  const summary = useLevySummary(range);
  const trend = useLevyTrend(range);

  const total = (summary.data ?? []).reduce((sum, row) => sum + row.totalAmount, 0);
  const byCategory = useMemo(() => levyByCategory(summary.data ?? []), [summary.data]);
  const trendPoints = useMemo(() => levyTrendPoints(trend.data ?? []), [trend.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeControl value={range} today={today} onChange={setRange} />
        <ExportMenu type="levy" range={range} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Wallet}
          label={t('kpiTotal')}
          value={formatRupiah(total)}
          unit=""
          loading={summary.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('chartByCategory')}>
          <ChartState
            loading={summary.isLoading}
            error={summary.isError}
            isEmpty={byCategory.length === 0}
            emptyLabel={t('emptyData')}
          >
            <LevyByCategory data={byCategory} />
          </ChartState>
        </ChartCard>

        <ChartCard title={t('chartTrend')}>
          <ChartState
            loading={trend.isLoading}
            error={trend.isError}
            isEmpty={trendPoints.length === 0}
            emptyLabel={t('emptyData')}
          >
            <LevyTrend data={trendPoints} />
          </ChartState>
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------------------- Data tab -------------------------------- */

const schema = z.object({
  categoryName: z.string().min(1, 'Kategori wajib diisi').max(100),
  date: z.string().min(1, 'Tanggal wajib diisi'),
  amount: z.coerce.number().int('Jumlah harus bilangan bulat').min(0, 'Jumlah tidak boleh negatif'),
  notes: z.string().max(256).optional(),
});
type Values = z.infer<typeof schema>;
const defaults: Values = { categoryName: '', date: '', amount: 0, notes: undefined };
const toForm = (r: LevyDto): Values => ({
  categoryName: r.categoryName,
  date: r.date,
  amount: r.amount,
  notes: r.notes ?? undefined,
});

function DataTab(): JSX.Element {
  const t = useTranslations('monitoring.levy');
  // Levy holds years of monthly rows — page on the server; the search box filters
  // by category name (the backend's `categoryName` contains-filter).
  const buildQuery = useCallback(({ page, pageSize, search }: ServerQueryParams): string => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    if (search.trim()) params.set('categoryName', search.trim());
    return `?${params.toString()}`;
  }, []);
  const manager = useServerResourceManager(levyApi, (r) => r.id, buildQuery);

  const columns = useMemo<ColumnDef<LevyDto, unknown>[]>(
    () => [
      {
        accessorKey: 'date',
        header: t('colDate'),
        meta: { label: t('colDate'), filterVariant: 'date' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatDateDisplay(row.original.date)}</span>
        ),
      },
      { accessorKey: 'categoryName', header: t('colCategory'), meta: { label: t('colCategory') } },
      {
        accessorKey: 'amount',
        header: t('colTotal'),
        meta: { label: t('colTotal'), filterVariant: 'number' },
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRupiah(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: 'notes',
        header: t('colNotes'),
        meta: { label: t('colNotes'), defaultHidden: true },
        cell: ({ row }) => <span>{row.original.notes || '—'}</span>,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        meta: { label: 'Aksi' },
        cell: ({ row }) => (
          <div className="text-right">
            <RowActions
              resource="levy"
              onView={() => manager.openView(row.original)}
              onEdit={() => manager.openEdit(row.original)}
              onDelete={() => manager.setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [manager, t],
  );

  return (
    <CrudListShell
      title=""
      resource="levy"
      manager={manager}
      columns={columns}
      searchPlaceholder={t('searchPlaceholder')}
      createLabel={t('createLabel')}
      serverPagination={manager.serverPagination}
      embedded
    >
      <CrudFormDialog
        manager={manager}
        schema={schema}
        defaults={defaults}
        toForm={toForm}
        title={{ create: t('createTitle'), edit: t('editTitle'), view: t('viewTitle') }}
        className="max-w-[480px]"
      >
        <TextField name="categoryName" label={t('fieldCategory')} required />
        <DateField name="date" label={t('fieldDate')} required />
        <NumberField name="amount" label={t('fieldAmount')} required unit="Rp" min={0} />
        <TextareaField name="notes" label={t('fieldNotes')} placeholder="Opsional" />
      </CrudFormDialog>
    </CrudListShell>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function LevyPage(): JSX.Element {
  const t = useTranslations('monitoring.levy');
  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">{t('tabSummary')}</TabsTrigger>
          <TabsTrigger value="data">{t('tabData')}</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <SummaryTab />
        </TabsContent>
        <TabsContent value="data">
          <DataTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
