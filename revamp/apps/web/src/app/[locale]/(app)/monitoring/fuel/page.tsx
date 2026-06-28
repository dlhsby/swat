'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Droplets, Fuel, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ChartCard } from '@/components/monitoring/chart-card';
import { FuelGrouped } from '@/components/monitoring/charts/fuel-grouped';
import { DateRangeControl } from '@/components/monitoring/date-range-control';
import { ExportMenu } from '@/components/monitoring/export-menu';
import { RefuelLogPanel } from '@/components/monitoring/refuel-log-panel';
import { PageHead } from '@/components/shell/page-head';
import {
  Badge,
  DataTable,
  MetricCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useFuelByType, useFuelConsumption } from '@/hooks/use-monitoring';
import { useMonitoringRange } from '@/hooks/use-monitoring-range';
import { formatFuel, formatNumber } from '@/lib/format';
import { type FuelByTypeRow, type FuelConsumptionRow } from '@/lib/monitoring-api';
import { type FuelBar, fuelBars } from '@/lib/monitoring-charts';

export default function FuelPage(): JSX.Element {
  const t = useTranslations('monitoring.fuel');
  const tCommon = useTranslations('monitoring.common');
  const { range, setRange, today } = useMonitoringRange();
  const fuel = useFuelConsumption(range);
  const byType = useFuelByType(range);

  const rows = fuel.data ?? [];
  const typeRows = byType.data ?? [];
  const totalApproved = rows.reduce((sum, row) => sum + row.fuelApprovedLiters, 0);
  const totalRequested = rows.reduce((sum, row) => sum + row.fuelRequestedLiters, 0);
  const flagged = rows.filter((row) => row.flag === 'RED').length;

  // Reuse the grouped requested/approved bar by mapping fuel-type rows onto it
  // (label = fuel name; no anomaly flag at the aggregate level).
  const typeBars: FuelBar[] = typeRows.map((row) => ({
    plate: row.fuelName,
    requested: Math.round(row.totalRequestedLiters * 100) / 100,
    approved: Math.round(row.totalApprovedLiters * 100) / 100,
    flagged: false,
  }));

  const columns: ColumnDef<FuelConsumptionRow>[] = [
    { accessorKey: 'plateNumber', header: t('colPlate') },
    {
      accessorKey: 'fuelRequestedLiters',
      header: t('colRequested'),
      cell: ({ row }) => formatFuel(row.original.fuelRequestedLiters),
    },
    {
      accessorKey: 'fuelApprovedLiters',
      header: t('colApproved'),
      cell: ({ row }) => formatFuel(row.original.fuelApprovedLiters),
    },
    {
      accessorKey: 'variancePercent',
      header: t('colVariance'),
      cell: ({ row }) => `${row.original.variancePercent}%`,
    },
    {
      accessorKey: 'flag',
      header: t('colFlag'),
      cell: ({ row }) =>
        row.original.flag === 'RED' ? (
          <Badge variant="red">{t('flagRed')}</Badge>
        ) : (
          <Badge variant="green">{t('flagOk')}</Badge>
        ),
    },
  ];

  const typeColumns: ColumnDef<FuelByTypeRow>[] = [
    { accessorKey: 'fuelName', header: t('colFuelType') },
    {
      accessorKey: 'totalRequestedLiters',
      header: t('colTypeRequested'),
      cell: ({ row }) => formatFuel(row.original.totalRequestedLiters),
    },
    {
      accessorKey: 'totalApprovedLiters',
      header: t('colTypeApproved'),
      cell: ({ row }) => formatFuel(row.original.totalApprovedLiters),
    },
  ];

  return (
    <>
      <PageHead title={t('title')} description={t('subtitle')} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeControl value={range} today={today} onChange={setRange} />
        <ExportMenu type="fuel" range={range} />
      </div>

      <Tabs defaultValue="summary" className="mt-4">
        <TabsList>
          <TabsTrigger value="summary">{t('tabSummary')}</TabsTrigger>
          <TabsTrigger value="byType">{t('tabByType')}</TabsTrigger>
          <TabsTrigger value="history">{t('tabHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              icon={Fuel}
              label={t('kpiApproved')}
              value={formatNumber(totalApproved)}
              unit="L"
              loading={fuel.isLoading}
            />
            <MetricCard
              icon={Droplets}
              label={t('kpiRequested')}
              value={formatNumber(totalRequested)}
              unit="L"
              loading={fuel.isLoading}
            />
            <MetricCard
              icon={Truck}
              label={t('kpiVehicles')}
              value={formatNumber(rows.length)}
              unit="unit"
              loading={fuel.isLoading}
            />
            <MetricCard
              icon={AlertTriangle}
              label={t('kpiFlagged')}
              value={formatNumber(flagged)}
              unit="unit"
              loading={fuel.isLoading}
            />
          </div>

          <div className="mt-4">
            <ChartCard title={t('chartTitle')} subtitle={t('chartSub')}>
              {rows.length === 0 ? (
                <p className="py-12 text-center text-body-sm text-neutral-500">
                  {tCommon('empty')}
                </p>
              ) : (
                <FuelGrouped data={fuelBars(rows)} />
              )}
            </ChartCard>
          </div>

          <div className="mt-4">
            <ChartCard title={t('tableTitle')}>
              <DataTable
                columns={columns}
                data={rows}
                loading={fuel.isLoading}
                error={fuel.isError}
                emptyTitle={tCommon('empty')}
              />
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="byType">
          <ChartCard title={t('chartByTypeTitle')} subtitle={t('chartByTypeSub')}>
            {typeBars.length === 0 ? (
              <p className="py-12 text-center text-body-sm text-neutral-500">{tCommon('empty')}</p>
            ) : (
              <FuelGrouped data={typeBars} />
            )}
          </ChartCard>
          <div className="mt-4">
            <ChartCard title={t('chartByTypeTitle')}>
              <DataTable
                columns={typeColumns}
                data={typeRows}
                loading={byType.isLoading}
                error={byType.isError}
                emptyTitle={tCommon('empty')}
              />
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <RefuelLogPanel />
        </TabsContent>
      </Tabs>
    </>
  );
}
