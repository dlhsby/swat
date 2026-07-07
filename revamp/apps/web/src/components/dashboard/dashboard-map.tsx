'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { ChartCard } from '@/components/monitoring/chart-card';
import { HaulingMap } from '@/components/monitoring/hauling-map';
import { MapSearch, type SearchEntry } from '@/components/monitoring/map-search';
import { type SelectedSite, SiteDetailSheet } from '@/components/monitoring/site-detail-sheet';
import { VehicleDetailSheet } from '@/components/monitoring/vehicle-detail-sheet';
import { useRouteMap } from '@/hooks/use-monitoring';
import { usePermissions } from '@/hooks/use-permissions';
import { useFleetPositions, useVehicleTrack } from '@/hooks/use-tracking';
import { type TrackPoint } from '@/lib/tracking-api';

/** Stable empty trail so the map effect doesn't re-run every render when off. */
const NO_TRAIL: readonly TrackPoint[] = [];

/**
 * The dashboard's embedded monitoring map: TPS/TPA/SPBU + live vehicle markers for
 * the picked day, a combined nopol/site search, and click-to-drill-down — a
 * vehicle opens its day trips + activity, a TPS/TPA opens its day tonase/pickups.
 * Live vehicle layer is gated by `tracking:read`; sites + site detail need only
 * `monitoring:read` (the map still renders without tracking).
 */
export function DashboardMap({ date }: { date: string }): JSX.Element {
  const t = useTranslations('dashboard');
  const { can } = usePermissions();
  const canTrack = can('tracking:read');

  const range = useMemo(() => ({ dateFrom: date, dateTo: date }), [date]);
  const map = useRouteMap(range);
  const fleet = useFleetPositions(canTrack);

  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; plate: string } | null>(
    null,
  );
  const [selectedSite, setSelectedSite] = useState<SelectedSite | null>(null);
  const [focusSiteId, setFocusSiteId] = useState<string | null>(null);
  const [showTrail, setShowTrail] = useState(false);
  const vehicleId = selectedVehicle?.id ?? null;
  const trail = useVehicleTrack(showTrail && vehicleId ? vehicleId : null);

  const sites = useMemo(() => map.data?.sites ?? [], [map.data]);

  const searchEntries = useMemo<SearchEntry[]>(
    () => [
      ...(canTrack
        ? fleet.positions.map((v) => ({
            id: v.vehicleId,
            kind: 'vehicle' as const,
            type: 'vehicle',
            label: v.plate,
            sublabel: t('searchCatKENDARAAN'),
          }))
        : []),
      ...sites.map((s) => ({
        id: s.id,
        kind: 'site' as const,
        type: s.type,
        label: s.name,
        sublabel: s.type,
      })),
    ],
    [canTrack, fleet.positions, sites, t],
  );

  const selectVehicle = (id: string, plate?: string): void => {
    setSelectedSite(null);
    setSelectedVehicle({
      id,
      plate: plate ?? fleet.positions.find((v) => v.vehicleId === id)?.plate ?? id,
    });
  };
  const selectSite = (id: string, type: string, name?: string): void => {
    setSelectedVehicle(null);
    setSelectedSite({ id, name: name ?? sites.find((s) => s.id === id)?.name ?? id, type });
    setFocusSiteId(id);
  };
  const onSearchSelect = (entry: SearchEntry): void => {
    if (entry.kind === 'vehicle') selectVehicle(entry.id, entry.label);
    else selectSite(entry.id, entry.type, entry.label);
  };

  return (
    <>
      <ChartCard
        title={t('mapTitle')}
        subtitle={t('mapSub')}
        right={
          searchEntries.length > 0 ? (
            <div className="w-64">
              <MapSearch entries={searchEntries} onSelect={onSearchSelect} />
            </div>
          ) : undefined
        }
      >
        <HaulingMap
          sites={sites}
          loading={map.isLoading}
          vehicles={canTrack ? fleet.positions : []}
          selectedVehicleId={vehicleId}
          onSelectVehicle={canTrack ? selectVehicle : undefined}
          onSelectSite={selectSite}
          focusSiteId={focusSiteId}
          trail={showTrail ? (trail.data ?? NO_TRAIL) : NO_TRAIL}
        />
      </ChartCard>

      {canTrack ? (
        <VehicleDetailSheet
          vehicleId={vehicleId}
          plate={selectedVehicle?.plate ?? null}
          date={date}
          openAlertCount={0}
          showTrail={showTrail}
          onToggleTrail={setShowTrail}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedVehicle(null);
              setShowTrail(false);
            }
          }}
        />
      ) : null}

      <SiteDetailSheet
        site={selectedSite}
        date={date}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSite(null);
            // Clear the map focus too, so re-selecting the same site re-pans it
            // (the focus effect only fires when focusSiteId actually changes).
            setFocusSiteId(null);
          }
        }}
      />
    </>
  );
}
