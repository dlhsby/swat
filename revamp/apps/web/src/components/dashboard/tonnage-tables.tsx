'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { ChartCard } from '@/components/monitoring/chart-card';
import { VehicleDetailSheet } from '@/components/monitoring/vehicle-detail-sheet';
import { DataTable, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { useTonnageByTps, useTonnageByVehicle } from '@/hooks/use-monitoring';
import { formatNumber, formatTonnage } from '@/lib/format';
import { type TonnageByTpsRow, type TonnageByVehicleRow } from '@/lib/monitoring-api';
import { kgToTon } from '@/lib/monitoring-charts';

/**
 * Disposal-tonnage breakdown tables for the picked day: per TPS (pickup site) and
 * per (vehicle, TPS). "rit" is the number of disposal trips — a vehicle serving
 * two TPS shows once per site. Clicking a vehicle row opens its day drill-down
 * (the trips it ran that day), which is always date-coherent — unlike the live
 * map layer, these rows ARE the selected day's operating vehicles.
 */
export function TonnageTables({ date }: { date: string }): JSX.Element {
  const t = useTranslations('dashboard');
  const range = { dateFrom: date, dateTo: date };
  const byTps = useTonnageByTps(range);
  const byVehicle = useTonnageByVehicle(range);

  const [selected, setSelected] = useState<{ id: string; plate: string } | null>(null);
  const [showTrail, setShowTrail] = useState(false);

  const tpsColumns: ColumnDef<TonnageByTpsRow>[] = [
    { accessorKey: 'name', header: t('colTps') },
    {
      accessorKey: 'totalTonnageKg',
      header: t('colTonnage'),
      cell: ({ row }) => (
        <span className="tabular-nums">{formatTonnage(kgToTon(row.original.totalTonnageKg))}</span>
      ),
    },
    {
      accessorKey: 'rit',
      header: t('colRit'),
      cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.rit)}</span>,
    },
  ];

  const vehicleColumns: ColumnDef<TonnageByVehicleRow>[] = [
    {
      accessorKey: 'plateNumber',
      header: t('colPlate'),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() =>
            setSelected({ id: row.original.vehicleId, plate: row.original.plateNumber })
          }
          className="font-mono font-medium text-primary-700 hover:underline"
        >
          {row.original.plateNumber}
        </button>
      ),
    },
    { accessorKey: 'siteName', header: t('colTps') },
    {
      accessorKey: 'rit',
      header: t('colRit'),
      cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.rit)}</span>,
    },
  ];

  return (
    <>
      <ChartCard title={t('tableTonnageTitle')} subtitle={t('tableTonnageSub')}>
        <Tabs defaultValue="tps">
          <TabsList>
            <TabsTrigger value="tps">{t('groupByTps')}</TabsTrigger>
            <TabsTrigger value="vehicle">{t('groupByVehicle')}</TabsTrigger>
          </TabsList>
          <TabsContent value="tps">
            <DataTable
              columns={tpsColumns}
              data={byTps.data ?? []}
              loading={byTps.isLoading}
              error={byTps.isError}
              emptyTitle={t('emptyTable')}
            />
          </TabsContent>
          <TabsContent value="vehicle">
            <DataTable
              columns={vehicleColumns}
              data={byVehicle.data ?? []}
              loading={byVehicle.isLoading}
              error={byVehicle.isError}
              emptyTitle={t('emptyTable')}
              searchPlaceholder={t('searchPlateOrTps')}
            />
          </TabsContent>
        </Tabs>
      </ChartCard>

      <VehicleDetailSheet
        vehicleId={selected?.id ?? null}
        plate={selected?.plate ?? null}
        date={date}
        openAlertCount={0}
        showTrail={showTrail}
        onToggleTrail={setShowTrail}
        showTrailToggle={false}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setShowTrail(false);
          }
        }}
      />
    </>
  );
}
