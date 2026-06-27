'use client';

import { useEffect, useRef, useState } from 'react';

import {
  type ConnectionState,
  fleetStreamUrl,
  type LiveAlert,
  type LivePosition,
} from '@/lib/realtime';

const MAX_ALERTS = 100;

export interface LiveFleet {
  /** Latest position per vehicle, keyed by vehicleId. */
  readonly positions: ReadonlyMap<string, LivePosition>;
  /** Most-recent alerts first (capped). */
  readonly alerts: readonly LiveAlert[];
  readonly connectionState: ConnectionState;
}

/**
 * Subscribe to the live fleet SSE stream (Phase 7, T-716). Returns the latest
 * position per vehicle, a capped rolling list of alerts, and the connection
 * state. EventSource reconnects natively; the hook tears the stream down on
 * unmount or when disabled. SSR-safe (no EventSource on the server).
 */
export function useLiveFleet(opts: { vehicleId?: string; enabled?: boolean } = {}): LiveFleet {
  const { vehicleId, enabled = true } = opts;
  const [positions, setPositions] = useState<ReadonlyMap<string, LivePosition>>(new Map());
  const [alerts, setAlerts] = useState<readonly LiveAlert[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setConnectionState('closed');
      return undefined;
    }

    setConnectionState('connecting');
    const source = new EventSource(fleetStreamUrl(vehicleId), { withCredentials: true });
    sourceRef.current = source;

    source.addEventListener('open', () => setConnectionState('open'));
    source.addEventListener('error', () => setConnectionState('connecting')); // ES auto-reconnects

    source.addEventListener('position', (event) => {
      try {
        const pos = JSON.parse((event as MessageEvent).data) as LivePosition;
        setPositions((prev) => new Map(prev).set(pos.vehicleId, pos));
      } catch {
        // ignore malformed frame
      }
    });

    source.addEventListener('alert', (event) => {
      try {
        const alert = JSON.parse((event as MessageEvent).data) as LiveAlert;
        setAlerts((prev) => [alert, ...prev].slice(0, MAX_ALERTS));
      } catch {
        // ignore malformed frame
      }
    });

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [vehicleId, enabled]);

  return { positions, alerts, connectionState };
}
