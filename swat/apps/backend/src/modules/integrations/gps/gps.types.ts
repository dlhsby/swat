/**
 * GPS tracking shared constants + the canonical ping shape (Phase 7).
 *
 * Every ingestion source (the GPS.id webhook now; a future mobile-app endpoint
 * later) normalizes its payload into ONE {@link CanonicalPing} and enqueues it to
 * the shared `gps-ingest` queue, so the worker → persist → matcher → realtime
 * pipeline is source-agnostic.
 */

/** BullMQ queue that buffers normalized pings for the ingest worker. */
export const GPS_INGEST_QUEUE = 'gps-ingest';

/** The single job name on the ingest queue. */
export const GPS_INGEST_JOB = 'ingest';

/** Redis pub/sub channels bridged to the realtime gateway (Epic 7.4). */
export const GPS_POSITIONS_CHANNEL = 'gps:positions';
export const GPS_ALERTS_CHANNEL = 'gps:alerts';

/** Provider tag for hardware GPS.id pings. */
export const GPS_SOURCE_GPSID = 'gpsid';

/**
 * Normalized, source-agnostic GPS fix. All fields are already validated +
 * range-checked by the producing adapter; the worker treats this as trusted.
 * Timestamps are UTC (`recordedAt`), display is reconciled to Asia/Jakarta.
 */
export interface CanonicalPing {
  /** Device identifier (IMEI for GPS.id hardware). Resolves to a GpsDevice. */
  readonly imei: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKmh: number;
  readonly heading: number | null;
  readonly engineOn: boolean;
  /** Device odometer in metres (primary distance source). */
  readonly odometerM: number;
  /** Device event time (UTC). */
  readonly recordedAt: string;
  /** Source tag persisted on the ping (`gpsid` | `mobile` | …). */
  readonly source: string;
  /** GPS accuracy in metres, when the source reports it. */
  readonly accuracyM: number | null;
  /** Plate as reported by the source — cross-check only, never trusted. */
  readonly reportedPlate: string | null;
}

/** BullMQ job payload: a batch of normalized pings from one webhook call. */
export interface GpsIngestJobData {
  readonly pings: readonly CanonicalPing[];
}
