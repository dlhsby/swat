'use client';

import { Fuel, Gauge, Scale, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MetricCard } from '@/components/ui';
import { useDayStats } from '@/hooks/use-monitoring';
import { formatFuel, formatNumber, formatTonnage } from '@/lib/format';
import { kgToTon } from '@/lib/monitoring-charts';

/**
 * The four dashboard stat cards for the picked day, from the live records:
 * scheduled vehicles, weighed disposal trips (pengangkutan), disposal tonase,
 * and approved BBM. Requires `monitoring:read` (served by `day-stats`).
 */
export function DashboardStats({ date }: { date: string }): JSX.Element {
  const t = useTranslations('dashboard');
  const { data, isLoading } = useDayStats(date);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        icon={Truck}
        label={t('metricActiveVehicles')}
        value={formatNumber(data?.scheduledVehicles ?? 0)}
        unit={t('unitVehicles')}
        loading={isLoading}
      />
      <MetricCard
        icon={Gauge}
        label={t('metricHauls')}
        value={formatNumber(data?.disposalTripCount ?? 0)}
        unit={t('unitHauls')}
        loading={isLoading}
      />
      <MetricCard
        icon={Scale}
        label={t('metricTonnage')}
        value={formatTonnage(kgToTon(data?.disposalTonnageKg ?? 0)).replace(' ton', '')}
        unit={t('unitTon')}
        loading={isLoading}
      />
      <MetricCard
        icon={Fuel}
        label={t('metricFuel')}
        value={formatFuel(data?.fuelApprovedLiters ?? 0).replace(' L', '')}
        unit={t('unitLiters')}
        loading={isLoading}
      />
    </div>
  );
}
