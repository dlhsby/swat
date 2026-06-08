'use client';

import { Fuel, Inbox, MapPin, Scale } from 'lucide-react';
import { type ComponentType } from 'react';

import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  StatusPill,
} from '@/components/ui';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { type HaulAssignmentDto, type RouteCategory, type TripDto } from '@/lib/types/transactions';

interface TripIconMeta {
  icon: ComponentType<{ className?: string }>;
  tone: string;
}
const TRIP_FALLBACK: TripIconMeta = { icon: MapPin, tone: 'bg-neutral-100 text-neutral-600' };
const ICONS: Record<string, TripIconMeta> = {
  PICKUP: { icon: Inbox, tone: 'bg-info-100 text-info-700' },
  DISPOSAL: { icon: Scale, tone: 'bg-success-100 text-success-700' },
  REFUEL: { icon: Fuel, tone: 'bg-warning-100 text-warning-700' },
  DEPART_POOL: TRIP_FALLBACK,
  RETURN_POOL: TRIP_FALLBACK,
};

const RECORD_PERMISSION: Record<RouteCategory, string> = {
  PICKUP: 'trip:record-pickup',
  DISPOSAL: 'trip:record-disposal',
  REFUEL: 'trip:record-fuel',
  DEPART_POOL: 'trip:update',
  RETURN_POOL: 'trip:update',
};

export interface TripSheetProps {
  assignment: HaulAssignmentDto | null;
  vehiclePlate?: string;
  onOpenChange: (open: boolean) => void;
  onRecord: (trip: TripDto) => void;
  onVerify: (trip: TripDto) => void;
}

/** Right-side sheet listing a haul assignment's trips with contextual actions. */
export function TripSheet({
  assignment,
  vehiclePlate,
  onOpenChange,
  onRecord,
  onVerify,
}: TripSheetProps): JSX.Element {
  const { can } = usePermissions();

  return (
    <Sheet open={assignment !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,520px)]">
        <SheetHeader>
          <SheetTitle>
            Trayek — {vehiclePlate} · {assignment?.driverName}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-2">
          {(assignment?.trips ?? []).map((trip) => {
            const category = trip.routeCategory ?? 'DEPART_POOL';
            const { icon: Icon, tone } = ICONS[category] ?? TRIP_FALLBACK;
            const canRecord = can(RECORD_PERMISSION[category]);
            return (
              <div
                key={trip.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn('flex h-9 w-9 items-center justify-center rounded-base', tone)}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-neutral-900">
                      {trip.name}
                    </p>
                    <p className="text-tiny text-neutral-500">
                      Target {trip.targetTime ? formatTime(trip.targetTime) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill domain="trip" value={trip.status} />
                  {trip.status === 'IN_PROGRESS' && canRecord ? (
                    <Button size="sm" onClick={() => onRecord(trip)}>
                      Catat
                    </Button>
                  ) : null}
                  {trip.status === 'DONE' && can('trip:verify') ? (
                    <Button size="sm" variant="secondary" onClick={() => onVerify(trip)}>
                      Verifikasi
                    </Button>
                  ) : null}
                  {trip.status === 'VERIFIED' && can('trip:override') && canRecord ? (
                    <Button size="sm" variant="outline" onClick={() => onRecord(trip)}>
                      Ubah
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
