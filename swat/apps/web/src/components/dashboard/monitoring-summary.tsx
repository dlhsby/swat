'use client';

import {
  AlertTriangle,
  FuelIcon,
  type LucideIcon,
  MapPin,
  Ticket,
  Truck,
  Wallet,
  Weight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ChartCard } from '@/components/monitoring/chart-card';
import { SourceDonut } from '@/components/monitoring/charts/source-donut';
import { TonnageColumns } from '@/components/monitoring/charts/tonnage-columns';
import { Card, CardContent, MetricCard } from '@/components/ui';
import {
  useFuelConsumption,
  useKpiOverview,
  useLevySummary,
  useTonnage5Day,
  useTonnageBySource,
  useTonnageMonthly,
} from '@/hooks/use-monitoring';
import { Link } from '@/i18n/navigation';
import { todayWIB } from '@/lib/dates';
import { formatFuel, formatNumber, formatRupiah } from '@/lib/format';
import {
  datePresets,
  kgToTon,
  monthlyTonnageTrend,
  sourceComposition,
  tonnageTrend,
} from '@/lib/monitoring-charts';

/** A deep-link tile into one of the four monitoring domains. */
function DomainLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-base border border-neutral-200 px-4 py-3 transition-colors hover:border-primary-300 hover:bg-primary-50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-base bg-primary-50 text-primary-700">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1 text-body-sm font-medium text-neutral-900">{label}</span>
      <span className="text-body-sm font-medium text-primary-700">→</span>
    </Link>
  );
}

/** Small "view all" link rendered in a chart card's header. */
function ViewAll({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <Link href={href} className="text-body-sm font-medium text-primary-700 hover:underline">
      {label} →
    </Link>
  );
}

/**
 * Cross-domain monitoring summary for the dashboard: month-to-date KPIs across all
 * four domains plus a 7-day tonnage trend and source mix, each linking into the
 * full domain page. Reads the rollup-backed monitoring API (current-day fresh via
 * the incremental refresh), so it's cheap and never scans the live trip table.
 * Mounted only for users with `monitoring:read`.
 */
export function MonitoringSummary(): JSX.Element {
  const t = useTranslations('dashboard');
  const tNav = useTranslations('nav');

  const today = todayWIB();
  const presets = datePresets(today);
  const month = useMemo(
    () => ({ dateFrom: presets.thisMonth.dateFrom, dateTo: presets.thisMonth.dateTo }),
    [presets],
  );
  const week = useMemo(
    () => ({ dateFrom: presets.last7.dateFrom, dateTo: presets.last7.dateTo }),
    [presets],
  );
  // Last-month-start → today, so the monthly trend yields this + previous month
  // and we can read the month-over-month delta off the latest point.
  const monthTrend = useMemo(
    () => ({ dateFrom: presets.lastMonth.dateFrom, dateTo: presets.thisMonth.dateTo }),
    [presets],
  );

  const kpi = useKpiOverview(month);
  const levy = useLevySummary(month);
  const daily = useTonnage5Day(week);
  const bySource = useTonnageBySource(month);
  const monthly = useTonnageMonthly(monthTrend);
  const fuel = useFuelConsumption(month);

  const levyTotal = (levy.data ?? []).reduce((sum, row) => sum + row.totalAmount, 0);
  const trend = tonnageTrend(daily.data ?? []);
  const composition = sourceComposition(bySource.data ?? []);
  const fuelAnomalies = (fuel.data ?? []).filter((row) => row.flag === 'RED').length;

  // Month-over-month tonnage delta (latest monthly point vs the prior month).
  const monthlyPoints = monthlyTonnageTrend(monthly.data ?? []);
  const latest = monthlyPoints.at(-1);
  const deltaPct = latest?.deltaPct ?? null;
  const tonnageDelta =
    deltaPct === null
      ? undefined
      : {
          text: `${Math.abs(deltaPct).toLocaleString('id-ID', { maximumFractionDigits: 1 })}% ${t('vsLastMonth')}`,
          tone: (deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'neutral') as
            | 'up'
            | 'down'
            | 'neutral',
        };

  return (
    <section className="mt-8">
      <h2 className="text-h3 font-semibold text-neutral-900">{t('monitoringSummary')}</h2>
      <p className="mt-0.5 text-body-sm text-neutral-500">{t('monitoringSummarySub')}</p>

      {fuelAnomalies > 0 ? (
        <Link
          href="/monitoring/fuel"
          className="mt-3 flex items-center gap-2 rounded-base border border-warning-100 bg-warning-50 px-4 py-2.5 text-body-sm font-medium text-warning-700 transition-colors hover:bg-warning-100"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{t('fuelAnomalies', { count: fuelAnomalies })}</span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={Weight}
          label={t('kpiTonnageMonth')}
          value={formatNumber(kgToTon(kpi.data?.totalTonnageKg ?? 0))}
          unit={t('unitTon')}
          delta={tonnageDelta}
          loading={kpi.isLoading}
        />
        <MetricCard
          icon={FuelIcon}
          label={t('kpiFuelMonth')}
          value={formatFuel(kpi.data?.fuelApprovedLiters ?? 0).replace(' L', '')}
          unit={t('unitLiters')}
          loading={kpi.isLoading}
        />
        <MetricCard
          icon={Truck}
          label={t('kpiVehiclesMonth')}
          value={formatNumber(kpi.data?.vehiclesInOperation ?? 0)}
          unit={t('unitVehicles')}
          loading={kpi.isLoading}
        />
        <MetricCard
          icon={Wallet}
          label={t('kpiLevyMonth')}
          value={formatRupiah(levyTotal)}
          unit=""
          loading={levy.isLoading}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t('chartTonnageWeek')}
          right={<ViewAll href="/monitoring/volume" label={t('viewAll')} />}
        >
          {trend.length === 0 ? (
            <p className="py-12 text-center text-body-sm text-neutral-500">{t('emptyChart')}</p>
          ) : (
            <TonnageColumns data={trend} />
          )}
        </ChartCard>
        <ChartCard
          title={t('chartSourceMonth')}
          right={<ViewAll href="/monitoring/volume" label={t('viewAll')} />}
        >
          {composition.slices.length === 0 ? (
            <p className="py-12 text-center text-body-sm text-neutral-500">{t('emptyChart')}</p>
          ) : (
            <SourceDonut slices={composition.slices} />
          )}
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardContent>
          <h3 className="mb-3 text-label font-medium text-neutral-500">{t('openMonitoring')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DomainLink href="/monitoring/volume" icon={Weight} label={tNav('volume')} />
            <DomainLink href="/monitoring/fuel" icon={FuelIcon} label={tNav('fuelMonitoring')} />
            <DomainLink href="/monitoring/hauling" icon={MapPin} label={tNav('hauling')} />
            <DomainLink href="/monitoring/levy" icon={Ticket} label={tNav('levy')} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
