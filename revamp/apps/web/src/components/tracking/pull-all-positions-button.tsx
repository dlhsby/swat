'use client';

import { LocateFixed } from 'lucide-react';
import { useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { Button, notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { pullAllDevicePositions } from '@/lib/gps-device-api';

/**
 * "Tarik Semua Posisi" — pulls every registered device's latest GPS.id position on
 * demand (`pullPositions()` on the backend), same idea as the per-device "Tarik
 * Posisi" button but fleet-wide. GPS.id self-throttles to 5 calls/5 min shared
 * across ALL vendor calls, so a large fleet only gets partway pulled per click —
 * the toast reports that honestly instead of pretending everything succeeded.
 * Gated `tracking:read` (matches the per-device pull). Reused on the device
 * registry and the vehicle master.
 */
export function PullAllPositionsButton({
  onPulled,
  className,
}: {
  onPulled?: () => void;
  className?: string;
}): JSX.Element {
  const [pulling, setPulling] = useState(false);

  const handlePullAll = async (): Promise<void> => {
    setPulling(true);
    try {
      const r = await pullAllDevicePositions();
      if (r.rateLimited > 0) {
        notify.info(
          `Ditarik ${r.pulled} dari ${r.totalDevices} perangkat — sisanya kena rate limit GPS.id, coba lagi beberapa menit lagi.`,
        );
      } else {
        notify.success(`Posisi ${r.pulled} perangkat berhasil ditarik.`);
      }
      onPulled?.();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menarik posisi perangkat.');
    } finally {
      setPulling(false);
    }
  };

  return (
    <ProtectedAction permission="tracking:read">
      <Button
        variant="secondary"
        size="sm"
        className={className}
        onClick={() => void handlePullAll()}
        loading={pulling}
      >
        <LocateFixed className="h-4 w-4" aria-hidden /> Tarik Semua Posisi
      </Button>
    </ProtectedAction>
  );
}
