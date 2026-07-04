'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import { GpsSyncResultDialog } from '@/components/tracking/gps-sync-result-dialog';
import { Button, notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type GpsSyncResult, syncGpsidVehicles } from '@/lib/gps-device-api';

/**
 * "Sinkronkan GPS.id" action (Phase 7 / B4): reconciles the GPS.id vehicle roster
 * with the device registry by plate, then shows a results modal. Gated by
 * `gps-device:create`. Reused on the device registry and the vehicle master.
 * `onSynced` lets the host refresh its list once devices change.
 */
export function GpsSyncButton({
  onSynced,
  className,
}: {
  onSynced?: () => void;
  className?: string;
}): JSX.Element {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<GpsSyncResult | null>(null);

  const handleSync = async (): Promise<void> => {
    setSyncing(true);
    try {
      const r = await syncGpsidVehicles();
      setResult(r);
      onSynced?.();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyinkronkan dari GPS.id.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <ProtectedAction permission="gps-device:create">
        <Button
          variant="secondary"
          size="sm"
          className={className}
          onClick={() => void handleSync()}
          loading={syncing}
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Sinkronkan GPS.id
        </Button>
      </ProtectedAction>
      <GpsSyncResultDialog
        open={result !== null}
        onOpenChange={(open) => !open && setResult(null)}
        result={result}
      />
    </>
  );
}
