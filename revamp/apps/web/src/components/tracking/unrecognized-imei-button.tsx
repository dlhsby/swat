'use client';

import { Inbox } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { UnmatchedDevicesSheet } from '@/components/tracking/unmatched-devices-sheet';
import { Button, type ComboboxOption } from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { type VehicleDto, vehiclesApi } from '@/lib/master-api';

/**
 * "IMEI tak dikenal" action (Phase 7): opens the unmatched-IMEI queue where an
 * operator maps an unknown device to a vehicle. Self-contained (fetches the vehicle
 * options itself), so it can sit on any page — the device registry and the vehicle
 * master. Gated by `gps-device:read`.
 */
export function UnrecognizedImeiButton({
  onMapped,
  className,
}: {
  onMapped?: () => void;
  className?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const { rows: vehicles } = useResourceList(vehiclesApi.list);
  const vehicleOptions = useMemo<ComboboxOption[]>(
    () =>
      vehicles.map((v: VehicleDto) => ({
        value: v.id,
        label: `${v.plateNumber} · ${v.modelBrand}`,
      })),
    [vehicles],
  );

  return (
    <>
      <ProtectedAction permission="gps-device:read">
        <Button variant="secondary" size="sm" className={className} onClick={() => setOpen(true)}>
          <Inbox className="h-4 w-4" aria-hidden /> IMEI tak dikenal
        </Button>
      </ProtectedAction>
      <UnmatchedDevicesSheet
        open={open}
        onOpenChange={setOpen}
        vehicleOptions={vehicleOptions}
        onMapped={() => onMapped?.()}
      />
    </>
  );
}
