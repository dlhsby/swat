import { type Env } from './env.validation';

export type ConfigValueType = 'string' | 'number' | 'boolean';
export type ConfigGroup = 'gpsid' | 'maps' | 'gps' | 'weighbridge';

/**
 * One runtime-editable global setting. The catalog is the single source of truth for
 * BOTH the resolver (which env var backs each key) and the admin UI (which controls
 * to render). A DB `system_config` row for `key` overrides `envKey`; otherwise the
 * validated env value (already defaulted by the zod env schema) is used.
 */
export interface ConfigCatalogEntry {
  /** DB + API key, e.g. `gpsid.password`. */
  readonly key: string;
  /** The env var this setting falls back to. */
  readonly envKey: keyof Env;
  readonly group: ConfigGroup;
  readonly valueType: ConfigValueType;
  /** Encrypted at rest + never returned to the UI in the admin API. */
  readonly isSecret: boolean;
  /** id-ID label for the settings UI. */
  readonly label: string;
  readonly help?: string;
  /** Validate + normalize a user-provided string before it is stored. Throws on bad input. */
  readonly validate: (raw: string) => string;
}

const nonEmpty = (raw: string): string => {
  const v = raw.trim();
  if (!v) throw new Error('Tidak boleh kosong.');
  return v;
};

const intInRange =
  (min: number, max: number) =>
  (raw: string): string => {
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
      throw new Error(`Harus bilangan bulat ${min}–${max}.`);
    }
    return String(n);
  };

const boolean = (raw: string): string => {
  if (raw !== 'true' && raw !== 'false') throw new Error('Harus "true" atau "false".');
  return raw;
};

export const CONFIG_CATALOG: readonly ConfigCatalogEntry[] = [
  // --- Integrasi GPS.id ------------------------------------------------------
  { key: 'gpsid.baseUrl', envKey: 'GPSID_BASE_URL', group: 'gpsid', valueType: 'string', isSecret: false, label: 'URL API GPS.id', validate: nonEmpty },
  { key: 'gpsid.username', envKey: 'GPSID_USERNAME', group: 'gpsid', valueType: 'string', isSecret: false, label: 'Username GPS.id', validate: nonEmpty },
  { key: 'gpsid.password', envKey: 'GPSID_PASSWORD', group: 'gpsid', valueType: 'string', isSecret: true, label: 'Password GPS.id', validate: nonEmpty },
  { key: 'gpsid.vehicleSync', envKey: 'GPSID_VEHICLE_SYNC', group: 'gpsid', valueType: 'boolean', isSecret: false, label: 'Sinkronisasi kendaraan otomatis', help: 'Jalankan sinkronisasi roster GPS.id secara terjadwal.', validate: boolean },
  { key: 'gpsid.vehicleSyncIntervalMin', envKey: 'GPSID_VEHICLE_SYNC_INTERVAL_MIN', group: 'gpsid', valueType: 'number', isSecret: false, label: 'Interval sinkronisasi (menit)', validate: intInRange(1, 44640) },
  { key: 'gpsid.positionPull', envKey: 'GPSID_POSITION_PULL', group: 'gpsid', valueType: 'boolean', isSecret: false, label: 'Tarik posisi otomatis', help: 'Tarik riwayat posisi per perangkat aktif secara berkala.', validate: boolean },
  { key: 'gpsid.pullIntervalMin', envKey: 'GPSID_PULL_INTERVAL_MIN', group: 'gpsid', valueType: 'number', isSecret: false, label: 'Interval tarik posisi (menit)', validate: intInRange(1, 44640) },

  // --- Peta (Google Maps) ----------------------------------------------------
  { key: 'maps.serverKey', envKey: 'GOOGLE_MAPS_SERVER_KEY', group: 'maps', valueType: 'string', isSecret: true, label: 'Kunci Maps (server)', help: 'Untuk snap-to-road koridor. Batasi per IP + aktifkan Directions API.', validate: nonEmpty },
  { key: 'maps.browserKey', envKey: 'GOOGLE_MAPS_BROWSER_KEY', group: 'maps', valueType: 'string', isSecret: true, label: 'Kunci Maps (browser)', help: 'Untuk render peta di aplikasi. Batasi per HTTP referrer.', validate: nonEmpty },

  // --- Ambang GPS ------------------------------------------------------------
  { key: 'gps.deviceOfflineMinutes', envKey: 'GPS_DEVICE_OFFLINE_MINUTES', group: 'gps', valueType: 'number', isSecret: false, label: 'Batas perangkat offline (menit)', validate: intInRange(1, 1440) },
  { key: 'gps.geofenceDefaultRadiusM', envKey: 'GPS_GEOFENCE_DEFAULT_RADIUS_M', group: 'gps', valueType: 'number', isSecret: false, label: 'Radius geofence default (m)', validate: intInRange(10, 5000) },
  { key: 'gps.ingestRateLimitPerMin', envKey: 'GPS_INGEST_RATE_LIMIT_PER_MIN', group: 'gps', valueType: 'number', isSecret: false, label: 'Batas laju webhook (per menit)', validate: intInRange(1, 100000) },
  { key: 'gps.webhookToken', envKey: 'GPS_WEBHOOK_TOKEN', group: 'gps', valueType: 'string', isSecret: true, label: 'Token webhook GPS.id', validate: nonEmpty },
  { key: 'gps.allowedIps', envKey: 'GPS_WEBHOOK_ALLOWED_IPS', group: 'gps', valueType: 'string', isSecret: false, label: 'IP webhook diizinkan (pisah koma)', help: 'Kosongkan untuk mengizinkan semua IP.', validate: (raw) => raw.trim() },

  // --- Weighbridge -----------------------------------------------------------
  { key: 'weighbridge.rateLimitPerMin', envKey: 'WEIGHBRIDGE_RATE_LIMIT_PER_MIN', group: 'weighbridge', valueType: 'number', isSecret: false, label: 'Batas laju jembatan timbang (per menit)', validate: intInRange(1, 100000) },
];

export const CONFIG_BY_KEY: ReadonlyMap<string, ConfigCatalogEntry> = new Map(
  CONFIG_CATALOG.map((e) => [e.key, e]),
);
