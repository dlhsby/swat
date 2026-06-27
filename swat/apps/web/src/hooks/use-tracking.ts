'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type DeviationAlert, trackingApi, type VehiclePosition } from '@/lib/tracking-api';

import { useLiveFleet } from './use-live-fleet';

const KEY = 'gps-tracking';

/**
 * The whole active fleet's positions: a REST baseline (polled) overlaid with live
 * SSE positions, so live-gps vehicles move in real time while recorded-activity
 * markers refresh on the poll. Returns the merged list + the SSE connection state.
 */
export function useFleetPositions(enabled = true) {
  const baseline = useQuery({
    queryKey: [KEY, 'positions'],
    queryFn: () => trackingApi.positions(),
    refetchInterval: 20_000,
    enabled,
  });
  const live = useLiveFleet({ enabled });

  const positions = useMemo<VehiclePosition[]>(() => {
    const byId = new Map<string, VehiclePosition>(
      (baseline.data ?? []).map((p) => [p.vehicleId, p]),
    );
    for (const [vehicleId, p] of live.positions) {
      const base = byId.get(vehicleId);
      // Overlay live coords onto the live-gps baseline entry (keep plate/source).
      byId.set(vehicleId, {
        vehicleId,
        plate: base?.plate ?? vehicleId,
        source: 'live-gps',
        status: 'online',
        latitude: p.latitude,
        longitude: p.longitude,
        asOf: p.recordedAt,
        speedKmh: p.speedKmh,
        heading: p.heading,
        legLabel: null,
      });
    }
    return [...byId.values()];
  }, [baseline.data, live.positions]);

  return { positions, isLoading: baseline.isLoading, connectionState: live.connectionState };
}

/** Open (unresolved) deviation alerts — REST list merged with live SSE arrivals. */
export function useAlerts(enabled = true) {
  const list = useQuery({
    queryKey: [KEY, 'alerts'],
    queryFn: () => trackingApi.alerts({ resolved: false }),
    refetchInterval: 30_000,
    enabled,
  });
  const live = useLiveFleet({ enabled });

  const alerts = useMemo<DeviationAlert[]>(() => {
    const byId = new Map<string, DeviationAlert>((list.data ?? []).map((a) => [a.id, a]));
    for (const a of live.alerts) {
      if (!byId.has(a.id)) {
        byId.set(a.id, {
          ...a,
          vehiclePlate: a.vehicleId,
          pingCount: 1,
          isAcknowledged: false,
          acknowledgedAt: null,
          resolvedAt: null,
          notes: null,
        });
      }
    }
    return [...byId.values()].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  }, [list.data, live.alerts]);

  return { alerts, isLoading: list.isLoading, connectionState: live.connectionState };
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; notes?: string }) =>
      trackingApi.acknowledge(input.id, input.notes),
    onSuccess: () => {
      notify.success('Peringatan diakui.');
      void queryClient.invalidateQueries({ queryKey: [KEY, 'alerts'] });
    },
    onError: (err) =>
      notify.error(err instanceof ApiError ? err.message : 'Gagal mengakui peringatan.'),
  });
}
