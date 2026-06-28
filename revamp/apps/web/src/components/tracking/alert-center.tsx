'use client';

import { BellRing } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
} from '@/components/ui';
import { useAcknowledgeAlert, useAlerts } from '@/hooks/use-tracking';
import { formatTime } from '@/lib/format';
import { type DeviationAlert } from '@/lib/tracking-api';

const TYPE_LABEL: Record<string, string> = {
  off_corridor: 'Keluar koridor',
  off_sequence: 'Urutan menyimpang',
  dwell_too_long: 'Berhenti terlalu lama',
  late_to_schedule: 'Terlambat dari jadwal',
};

function severityVariant(severity: string): 'red' | 'amber' | 'blue' {
  if (severity === 'CRITICAL') return 'red';
  if (severity === 'WARNING') return 'amber';
  return 'blue';
}

/**
 * Alert center (Phase 7, T-718). Live feed of open route-deviation alerts (REST
 * baseline + SSE arrivals via {@link useAlerts}), each acknowledgeable. Only
 * live-gps vehicles produce corridor deviations here; untracked-vehicle lateness
 * stays a map status, not an alert. Gate rendering by `deviation-alert:read`.
 */
export function AlertCenter({ enabled = true }: { enabled?: boolean }): JSX.Element {
  const t = useTranslations('tracking');
  const { alerts, isLoading, connectionState } = useAlerts(enabled);
  const ack = useAcknowledgeAlert();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-4 w-4" aria-hidden />
          {t('alertCenter')}
          {alerts.length > 0 ? <Badge appearance="count">{alerts.length}</Badge> : null}
        </CardTitle>
        <span
          className={`h-2.5 w-2.5 rounded-full ${connectionState === 'open' ? 'bg-success-500' : 'bg-neutral-300'}`}
          title={connectionState}
          aria-label={connectionState}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState title={t('noAlerts')} />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {alerts.map((alert: DeviationAlert) => (
              <li key={alert.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                    <span className="font-mono text-body-sm">{alert.vehiclePlate}</span>
                  </div>
                  <p className="truncate text-body-sm text-neutral-600">
                    {TYPE_LABEL[alert.alertType] ?? alert.alertType}
                    {alert.distanceM != null ? ` · ${alert.distanceM} m` : ''}
                    {alert.pingCount > 1 ? ` · ${alert.pingCount}×` : ''} ·{' '}
                    {formatTime(alert.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => ack.mutate({ id: alert.id })}
                  loading={ack.isPending && ack.variables?.id === alert.id}
                >
                  {t('acknowledge')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
