import { type Env } from './env.validation';

export type ConfigValueType = 'string' | 'number' | 'boolean';
export type ConfigGroup = 'gpsid' | 'maps' | 'gps' | 'weighbridge' | 'gasification';

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
  {
    key: 'gpsid.baseUrl',
    envKey: 'GPSID_BASE_URL',
    group: 'gpsid',
    valueType: 'string',
    isSecret: false,
    label: 'URL API GPS.id',
    help: 'Alamat endpoint API GPS.id. Bawaan: https://portal.gps.id/backend/seen/public — ubah hanya bila vendor memberi endpoint berbeda.',
    validate: nonEmpty,
  },
  {
    key: 'gpsid.username',
    envKey: 'GPSID_USERNAME',
    group: 'gpsid',
    valueType: 'string',
    isSecret: false,
    label: 'Username GPS.id',
    help: 'Username akun API GPS.id. Didapat dari dashboard GPS.id atau vendor GPS.id.',
    validate: nonEmpty,
  },
  {
    key: 'gpsid.password',
    envKey: 'GPSID_PASSWORD',
    group: 'gpsid',
    valueType: 'string',
    isSecret: true,
    label: 'Password GPS.id',
    help: 'Password akun API GPS.id (dari vendor GPS.id). Disimpan terenkripsi; kosong = tidak diubah.',
    validate: nonEmpty,
  },
  {
    key: 'gpsid.vehicleSync',
    envKey: 'GPSID_VEHICLE_SYNC',
    group: 'gpsid',
    valueType: 'boolean',
    isSecret: false,
    label: 'Sinkronisasi kendaraan otomatis',
    help: 'Bila aktif, roster kendaraan GPS.id disinkronkan otomatis secara terjadwal (mencocokkan perangkat GPS ke kendaraan berdasarkan plat).',
    validate: boolean,
  },
  {
    key: 'gpsid.vehicleSyncIntervalMin',
    envKey: 'GPSID_VEHICLE_SYNC_INTERVAL_MIN',
    group: 'gpsid',
    valueType: 'number',
    isSecret: false,
    label: 'Interval sinkronisasi (menit)',
    help: 'Selang waktu sinkronisasi roster otomatis, dalam menit. Mis. 1440 = sekali sehari.',
    validate: intInRange(1, 44640),
  },
  {
    key: 'gpsid.positionPull',
    envKey: 'GPSID_POSITION_PULL',
    group: 'gpsid',
    valueType: 'boolean',
    isSecret: false,
    label: 'Tarik posisi otomatis',
    help: 'Bila aktif, riwayat posisi tiap perangkat aktif ditarik dari GPS.id secara berkala (pelengkap webhook push).',
    validate: boolean,
  },
  {
    key: 'gpsid.pullIntervalMin',
    envKey: 'GPSID_PULL_INTERVAL_MIN',
    group: 'gpsid',
    valueType: 'number',
    isSecret: false,
    label: 'Interval tarik posisi (menit)',
    help: 'Selang waktu tarik posisi otomatis, dalam menit. Mis. 1440 = sekali sehari.',
    validate: intInRange(1, 44640),
  },

  // --- Peta (Google Maps) ----------------------------------------------------
  {
    key: 'maps.serverKey',
    envKey: 'GOOGLE_MAPS_SERVER_KEY',
    group: 'maps',
    valueType: 'string',
    isSecret: true,
    label: 'Kunci Maps (server)',
    help: 'Kunci Google Maps sisi server untuk snap-to-road koridor. Buat di Google Cloud Console → aktifkan Directions API, batasi per alamat IP server. Disimpan terenkripsi.',
    validate: nonEmpty,
  },
  {
    key: 'maps.browserKey',
    envKey: 'GOOGLE_MAPS_BROWSER_KEY',
    group: 'maps',
    valueType: 'string',
    isSecret: true,
    label: 'Kunci Maps (browser)',
    help: 'Kunci Google Maps untuk menampilkan peta di peramban. Buat di Google Cloud Console → aktifkan Maps JavaScript API, batasi per HTTP referrer (domain aplikasi). Disimpan terenkripsi.',
    validate: nonEmpty,
  },

  // --- Pelacakan GPS: penerimaan data & webhook ------------------------------
  {
    key: 'gps.webhookToken',
    envKey: 'GPS_WEBHOOK_TOKEN',
    group: 'gps',
    valueType: 'string',
    isSecret: true,
    label: 'Token webhook GPS.id',
    help: 'Token rahasia pada URL webhook (POST /integrations/gps/webhook/:token). Buat string acak ≥16 karakter, lalu daftarkan URL berisi token ini ke GPS.id. Disimpan terenkripsi.',
    validate: nonEmpty,
  },
  {
    key: 'gps.allowedIps',
    envKey: 'GPS_WEBHOOK_ALLOWED_IPS',
    group: 'gps',
    valueType: 'string',
    isSecret: false,
    label: 'IP webhook diizinkan (pisah koma)',
    help: 'Daftar alamat IP sumber webhook yang diizinkan, dipisah koma (mis. IP egress GPS.id). Kosongkan untuk mengizinkan semua IP dan mengandalkan token.',
    validate: (raw) => raw.trim(),
  },
  {
    key: 'gps.ingestRateLimitPerMin',
    envKey: 'GPS_INGEST_RATE_LIMIT_PER_MIN',
    group: 'gps',
    valueType: 'number',
    isSecret: false,
    label: 'Batas laju webhook (per menit)',
    help: 'Batas jumlah kiriman webhook per menit per IP (pelindung dari banjir data). Bawaan 600.',
    validate: intInRange(1, 100000),
  },

  // --- Pelacakan GPS: deteksi pergerakan -------------------------------------
  {
    key: 'gps.deviceOfflineMinutes',
    envKey: 'GPS_DEVICE_OFFLINE_MINUTES',
    group: 'gps',
    valueType: 'number',
    isSecret: false,
    label: 'Batas perangkat offline (menit)',
    help: 'Perangkat yang tidak mengirim posisi selama menit ini ditandai offline di peta. Bawaan 10.',
    validate: intInRange(1, 1440),
  },
  {
    key: 'gps.geofenceDefaultRadiusM',
    envKey: 'GPS_GEOFENCE_DEFAULT_RADIUS_M',
    group: 'gps',
    valueType: 'number',
    isSecret: false,
    label: 'Radius geofence default (m)',
    help: 'Radius pagar geo (meter) untuk deteksi tiba/berangkat di lokasi, dipakai bila lokasi belum punya radius sendiri. Bawaan 100.',
    validate: intInRange(10, 5000),
  },

  // --- Jembatan Timbang ------------------------------------------------------
  {
    key: 'weighbridge.rateLimitPerMin',
    envKey: 'WEIGHBRIDGE_RATE_LIMIT_PER_MIN',
    group: 'weighbridge',
    valueType: 'number',
    isSecret: false,
    label: 'Batas laju jembatan timbang (per menit)',
    help: 'Batas jumlah permintaan API jembatan timbang TPA per menit. Bawaan 500.',
    validate: intInRange(1, 100000),
  },

  // --- Integrasi Gasifikasi (PT Surveyor Indonesia) --------------------------
  {
    key: 'gasification.enabled',
    envKey: 'GASIFICATION_ENABLED',
    group: 'gasification',
    valueType: 'boolean',
    isSecret: false,
    label: 'Sinkronisasi gasifikasi otomatis',
    help: 'Bila aktif dan kunci API terisi, data armada masuk gasifikasi dari PT Surveyor Indonesia ditarik berkala dan dicocokkan ke aktivitas pembuangan sampah.',
    validate: boolean,
  },
  {
    key: 'gasification.baseUrl',
    envKey: 'GASIFICATION_BASE_URL',
    group: 'gasification',
    valueType: 'string',
    isSecret: false,
    label: 'URL API gasifikasi',
    help: 'Alamat endpoint API PT Surveyor Indonesia. Bawaan: https://tpa.sidigital.co.id',
    validate: nonEmpty,
  },
  {
    key: 'gasification.apiKey',
    envKey: 'GASIFICATION_API_KEY',
    group: 'gasification',
    valueType: 'string',
    isSecret: true,
    label: 'Kunci API gasifikasi',
    help: 'Kunci API (header X-API-KEY) dari PT Surveyor Indonesia. Disimpan terenkripsi; kosong = tidak diubah.',
    validate: nonEmpty,
  },
  {
    key: 'gasification.photoBaseUrl',
    envKey: 'GASIFICATION_PHOTO_BASE_URL',
    group: 'gasification',
    valueType: 'string',
    isSecret: false,
    label: 'URL dasar foto gasifikasi',
    help: 'Alamat dasar file foto armada gasifikasi. Bawaan: https://fotoarmada.sidigital.co.id/gasifikasi/',
    validate: nonEmpty,
  },
  {
    key: 'gasification.pullIntervalMin',
    envKey: 'GASIFICATION_PULL_INTERVAL_MIN',
    group: 'gasification',
    valueType: 'number',
    isSecret: false,
    label: 'Interval tarik data (menit)',
    help: 'Selang waktu penarikan data gasifikasi otomatis, dalam menit. Mis. 10 = tiap 10 menit.',
    validate: intInRange(1, 44640),
  },
  {
    key: 'gasification.lookbackDays',
    envKey: 'GASIFICATION_LOOKBACK_DAYS',
    group: 'gasification',
    valueType: 'number',
    isSecret: false,
    label: 'Rentang tarik ulang (hari)',
    help: 'Berapa hari ke belakang (termasuk hari ini) yang dipindai ulang tiap siklus, agar data yang datang terlambat tetap tercocokkan. Bawaan 2.',
    validate: intInRange(1, 60),
  },
  {
    key: 'gasification.matchBeforeMin',
    envKey: 'GASIFICATION_MATCH_BEFORE_MIN',
    group: 'gasification',
    valueType: 'number',
    isSecret: false,
    label: 'Toleransi cocok sebelum (menit)',
    help: 'Selisih waktu maksimum bila catatan gasifikasi terjadi SEBELUM waktu pembuangan tercatat. Bawaan 30.',
    validate: intInRange(0, 1440),
  },
  {
    key: 'gasification.matchAfterMin',
    envKey: 'GASIFICATION_MATCH_AFTER_MIN',
    group: 'gasification',
    valueType: 'number',
    isSecret: false,
    label: 'Toleransi cocok sesudah (menit)',
    help: 'Selisih waktu maksimum bila catatan gasifikasi terjadi SESUDAH waktu pembuangan tercatat (umumnya begini). Bawaan 120.',
    validate: intInRange(0, 1440),
  },
  {
    key: 'gasification.maxRequestsPerMin',
    envKey: 'GASIFICATION_MAX_REQUESTS_PER_MIN',
    group: 'gasification',
    valueType: 'number',
    isSecret: false,
    label: 'Batas permintaan API (per menit)',
    help: 'Batas jumlah panggilan ke API PTSI per menit (PTSI tidak punya endpoint massal, jadi tiap plat ditarik satu per satu). Bila tercapai, sinkron berhenti dan dilanjutkan pada siklus berikutnya. Bawaan 60.',
    validate: intInRange(1, 100000),
  },
  {
    key: 'gasification.requeryCooldownMin',
    envKey: 'GASIFICATION_REQUERY_COOLDOWN_MIN',
    group: 'gasification',
    valueType: 'number',
    isSecret: false,
    label: 'Jeda tarik ulang per plat (menit)',
    help: 'Pada sinkron terjadwal, satu plat+tanggal tidak ditarik ulang selama menit ini — agar armada landfill (mayoritas) tidak dipanggil tiap siklus. Sinkron manual mengabaikan jeda ini. Bawaan 60.',
    validate: intInRange(0, 44640),
  },
];

export const CONFIG_BY_KEY: ReadonlyMap<string, ConfigCatalogEntry> = new Map(
  CONFIG_CATALOG.map((e) => [e.key, e]),
);
