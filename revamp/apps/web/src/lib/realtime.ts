/**
 * SSE realtime client config (Phase 7, T-716). The browser opens an EventSource
 * to the backend's `/realtime/fleet` stream; it carries the session cookie via
 * `withCredentials`, so no token plumbing is needed. EventSource reconnects
 * natively (honouring the server's retry hint) — the hook reflects that as
 * connection state.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export function fleetStreamUrl(vehicleId?: string): string {
  const url = `${BASE_URL}/api/v1/realtime/fleet`;
  return vehicleId ? `${url}?vehicleId=${encodeURIComponent(vehicleId)}` : url;
}

export interface LivePosition {
  readonly vehicleId: string;
  readonly imei: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKmh: number;
  readonly heading: number | null;
  readonly engineOn: boolean;
  readonly recordedAt: string;
  readonly source: string;
}

export interface LiveAlert {
  readonly id: string;
  readonly vehicleId: string;
  readonly tripId: string | null;
  readonly alertType: string;
  readonly severity: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceM: number | null;
  readonly createdAt: string;
}

export type ConnectionState = 'connecting' | 'open' | 'closed';
