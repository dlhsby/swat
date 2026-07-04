'use client';

import { Radio } from 'lucide-react';

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusPill,
  Switch,
} from '@/components/ui';
import { useTripSummary } from '@/hooks/use-monitoring';
import { useVehicleDayActivity } from '@/hooks/use-tracking';
import { formatTime } from '@/lib/format';
import { type DayActivityEvent } from '@/lib/tracking-api';

/** Indonesian label + accent for each activity milestone (the operators' vocabulary). */
const ACTIVITY_META: Record<string, { label: string; dot: string }> = {
  DEPART: { label: 'Keberangkatan (keluar pool)', dot: 'bg-primary-600' },
  ARRIVE: { label: 'Tiba di lokasi', dot: 'bg-primary-600' },
  WEIGH: { label: 'Timbang (jembatan timbang)', dot: 'bg-warning-500' },
  COMPLETE: { label: 'Selesai (tinggalkan lokasi)', dot: 'bg-neutral-400' },
  RETURN: { label: 'Kembali ke pool', dot: 'bg-success-600' },
};

const siteLabel = (type: string | null): string => {
  if (type === 'TPS') return 'TPS';
  if (type === 'TPA') return 'TPA';
  if (type === 'SPBU') return 'SPBU';
  if (type === 'POOL') return 'Pool';
  return '';
};

export interface VehicleDetailSheetProps {
  vehicleId: string | null;
  plate: string | null;
  /** Operation date (YYYY-MM-DD) whose trips + activity feed to show. */
  date: string;
  /** Open deviation alerts for this vehicle (from the page's alert list). */
  openAlertCount: number;
  showTrail: boolean;
  onToggleTrail: (show: boolean) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * Drill-down for one vehicle on the hauling map (Phase 7): today's trips with
 * late flags, the deviation count, the GPS activity timeline (keberangkatan → tiba
 * → timbang → selesai → kembali), and a toggle to draw the day's GPS trail.
 */
export function VehicleDetailSheet({
  vehicleId,
  plate,
  date,
  openAlertCount,
  showTrail,
  onToggleTrail,
  onOpenChange,
}: VehicleDetailSheetProps): JSX.Element {
  const trips = useTripSummary({ dateFrom: date, dateTo: date }, vehicleId ? { vehicleId } : {});
  const activity = useVehicleDayActivity(vehicleId, date);
  // The query already scopes to the vehicle server-side, so no client plate filter
  // (which would break the moment the vehicle drops off the live positions poll).
  const tripRows = trips.data?.data ?? [];
  const events = activity.data ?? [];

  return (
    <Sheet open={vehicleId !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(94vw,560px)]">
        <SheetHeader>
          <SheetTitle>Kendaraan {plate}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-tiny text-neutral-600">
              {tripRows.length} perjalanan hari ini
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-tiny ${
                openAlertCount > 0 ? 'bg-danger-50 text-danger-700' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {openAlertCount} penyimpangan aktif
            </span>
            <label className="ml-auto flex items-center gap-2 text-body-sm text-neutral-700">
              <Radio className="h-4 w-4 text-primary-600" aria-hidden />
              Tampilkan jejak
              <Switch checked={showTrail} onCheckedChange={onToggleTrail} aria-label="Tampilkan jejak GPS" />
            </label>
          </div>

          <section className="space-y-2">
            <h3 className="text-label font-semibold text-neutral-700">Perjalanan hari ini</h3>
            {trips.isLoading ? (
              <Skeleton className="h-24" />
            ) : tripRows.length === 0 ? (
              <p className="text-body-sm text-neutral-500">Belum ada perjalanan tercatat hari ini.</p>
            ) : (
              <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
                {tripRows.map((trip) => {
                  const late =
                    trip.targetTime && trip.actualTime && trip.actualTime > trip.targetTime;
                  return (
                    <li key={trip.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-medium text-neutral-900">
                          {trip.routeName ?? trip.name}
                        </p>
                        <p className="text-tiny text-neutral-500">
                          {trip.targetTime ? formatTime(trip.targetTime) : '—'} →{' '}
                          {trip.actualTime ? formatTime(trip.actualTime) : '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {late ? (
                          <span className="rounded-full bg-danger-50 px-2 py-0.5 text-tiny text-danger-700">
                            Terlambat
                          </span>
                        ) : null}
                        <StatusPill domain="trip" value={trip.status} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-label font-semibold text-neutral-700">Lini masa aktivitas</h3>
            {activity.isLoading ? (
              <Skeleton className="h-24" />
            ) : events.length === 0 ? (
              <p className="text-body-sm text-neutral-500">
                Belum ada aktivitas GPS hari ini (kendaraan belum terlacak melewati geofence lokasi).
              </p>
            ) : (
              <ol className="space-y-3">
                {events.map((e: DayActivityEvent) => {
                  const meta = ACTIVITY_META[e.kind] ?? { label: e.kind, dot: 'bg-neutral-400' };
                  const site = siteLabel(e.siteType);
                  return (
                    <li key={e.id} className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                      <div className="min-w-0">
                        <p className="text-body-sm text-neutral-900">
                          {meta.label}
                          {site ? <span className="text-neutral-500"> · {site}</span> : null}
                        </p>
                        <p className="text-tiny tabular-nums text-neutral-500">
                          {formatTime(e.occurredAt)}
                          {e.source === 'WEIGHBRIDGE' ? ' · dari jembatan timbang' : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
