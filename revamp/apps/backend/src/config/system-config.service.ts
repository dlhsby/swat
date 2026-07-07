import {
  BadRequestException,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

import { EncryptionService } from '../common/crypto/encryption.service';
import { CacheService } from '../modules/cache/cache.service';
import { PrismaService } from '../modules/prisma/prisma.service';

import { AppConfigService } from './config.service';
import {
  CONFIG_BY_KEY,
  CONFIG_CATALOG,
  type ConfigCatalogEntry,
  type ConfigValueType,
} from './system-config.catalog';
import { PRESEED_MARKER, buildConfigPreseedRows } from './system-config.preseed';

const CHANGE_CHANNEL = 'system-config:changed';
const RELOAD_INTERVAL_MS = 5 * 60_000; // backstop if a pub/sub message is missed

/** A catalog entry plus its current resolution state (for the admin API). */
export interface ConfigDescription {
  readonly key: string;
  readonly group: string;
  readonly valueType: ConfigValueType;
  readonly isSecret: boolean;
  readonly label: string;
  readonly help?: string;
  /** True when a DB override row is set. */
  readonly isSet: boolean;
  /** Where the effective value comes from. */
  readonly source: 'db' | 'env' | 'unset';
  /** The effective value — ONLY for non-secret keys; secrets never leave the server. */
  readonly value?: string | number | boolean;
}

/**
 * Resolves global system settings **DB → env → code default** and lets admins edit
 * them at runtime. DB values live in `system_config`; secrets are AES-256-GCM
 * encrypted. Values are cached in memory (loaded at boot), kept coherent across
 * instances by a Redis pub/sub invalidation channel, with a periodic full reload as
 * a backstop. Consumers read via the typed helpers instead of `AppConfigService`.
 */
@Injectable()
export class SystemConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemConfigService.name);
  /** key → raw DB `value` (string), or absent when no override row is set. */
  private cache = new Map<string, string>();
  private subscriber: Redis | null = null;
  private reloadTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly encryption: EncryptionService,
    private readonly redis: CacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
    await this.preseedFromEnvOnce();
    this.subscribeForInvalidation();
    this.reloadTimer = setInterval(() => void this.reload(), RELOAD_INTERVAL_MS);
    this.reloadTimer.unref();
  }

  /**
   * One-time, per-DB copy of the current env values into `system_config`, so a fresh
   * environment shows its real config in the admin UI (incl. which secrets are set)
   * instead of everything reading as "unset". Marker-guarded so it runs exactly once
   * — after that, clearing a key genuinely reverts it to env (it isn't re-seeded).
   * Best-effort: a failure never blocks boot (env fallback still works). Secrets are
   * skipped when no encryption key is configured.
   */
  private async preseedFromEnvOnce(): Promise<void> {
    try {
      const done = await this.prisma.systemConfig.findUnique({
        where: { key: PRESEED_MARKER },
        select: { key: true },
      });
      if (done) return;

      const rows = buildConfigPreseedRows(CONFIG_CATALOG, {
        readEnv: (envKey) => this.config.raw(envKey as Parameters<typeof this.config.raw>[0]),
        encrypt: (plaintext) => this.encryption.encrypt(plaintext),
        canEncrypt: this.encryption.available,
        isOverridden: (key) => this.cache.has(key),
      });

      await this.prisma.$transaction([
        ...(rows.length > 0
          ? [this.prisma.systemConfig.createMany({ data: rows, skipDuplicates: true })]
          : []),
        this.prisma.systemConfig.create({
          data: {
            key: PRESEED_MARKER,
            value: 'true',
            isSecret: false,
            valueType: 'boolean',
            group: '__meta',
          },
        }),
      ]);
      await this.reload();
      this.logger.log(`Preseeded ${rows.length} system settings from env.`);
    } catch (err) {
      this.logger.warn(`system_config preseed skipped: ${String(err)}`);
    }
  }

  onModuleDestroy(): void {
    if (this.reloadTimer) clearInterval(this.reloadTimer);
    if (this.subscriber) void this.subscriber.quit().catch(() => this.subscriber?.disconnect());
  }

  // --- Reads -----------------------------------------------------------------

  /** The effective value of a key (DB override → env → env default). */
  private resolve(key: string): string | number | boolean | undefined {
    const entry = this.entry(key);
    const dbValue = this.cache.get(key);
    if (dbValue !== undefined) {
      const decoded = entry.isSecret ? this.encryption.decrypt(dbValue) : dbValue;
      return coerce(decoded, entry.valueType);
    }
    return this.config.raw(entry.envKey) as string | number | boolean | undefined;
  }

  private getString(key: string): string | undefined {
    const v = this.resolve(key);
    return v === undefined || v === '' ? undefined : String(v);
  }

  private getNumber(key: string): number {
    return Number(this.resolve(key));
  }

  private getBoolean(key: string): boolean {
    return this.resolve(key) === true || this.resolve(key) === 'true';
  }

  // --- Typed domain helpers (mirror the old AppConfigService getters) --------

  getGpsidCredentials(): { baseUrl: string; username: string; password: string } | null {
    const baseUrl = this.getString('gpsid.baseUrl');
    const username = this.getString('gpsid.username');
    const password = this.getString('gpsid.password');
    return baseUrl && username && password ? { baseUrl, username, password } : null;
  }

  getGpsidVehicleSync(): boolean {
    return this.getBoolean('gpsid.vehicleSync');
  }

  getGpsidVehicleSyncIntervalMinutes(): number {
    return this.getNumber('gpsid.vehicleSyncIntervalMin');
  }

  getGpsidPositionPull(): boolean {
    return this.getBoolean('gpsid.positionPull');
  }

  getGpsidPullIntervalMinutes(): number {
    return this.getNumber('gpsid.pullIntervalMin');
  }

  getGoogleMapsServerKey(): string | undefined {
    return this.getString('maps.serverKey');
  }

  getGoogleMapsBrowserKey(): string | undefined {
    return this.getString('maps.browserKey');
  }

  getGpsWebhookToken(): string | undefined {
    return this.getString('gps.webhookToken');
  }

  getGpsAllowedIps(): string[] {
    return (this.getString('gps.allowedIps') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  getGpsIngestRateLimitPerMin(): number {
    return this.getNumber('gps.ingestRateLimitPerMin');
  }

  getGpsDeviceOfflineMinutes(): number {
    return this.getNumber('gps.deviceOfflineMinutes');
  }

  getGpsGeofenceDefaultRadiusM(): number {
    return this.getNumber('gps.geofenceDefaultRadiusM');
  }

  getWeighbridgeRateLimitPerMin(): number {
    return this.getNumber('weighbridge.rateLimitPerMin');
  }

  // --- Gasification (PT Surveyor Indonesia) ----------------------------------

  getGasificationEnabled(): boolean {
    return this.getBoolean('gasification.enabled');
  }

  /** API base URL + key; null when the key is unset (the job then no-ops). */
  getGasificationCredentials(): { baseUrl: string; apiKey: string } | null {
    const baseUrl = this.getString('gasification.baseUrl');
    const apiKey = this.getString('gasification.apiKey');
    return baseUrl && apiKey ? { baseUrl, apiKey } : null;
  }

  getGasificationPhotoBaseUrl(): string {
    return (
      this.getString('gasification.photoBaseUrl') ??
      'https://fotoarmada.sidigital.co.id/gasifikasi/'
    );
  }

  getGasificationPullIntervalMinutes(): number {
    return this.getNumber('gasification.pullIntervalMin');
  }

  getGasificationLookbackDays(): number {
    return this.getNumber('gasification.lookbackDays');
  }

  getGasificationMatchWindow(): { beforeMin: number; afterMin: number } {
    return {
      beforeMin: this.getNumber('gasification.matchBeforeMin'),
      afterMin: this.getNumber('gasification.matchAfterMin'),
    };
  }

  getGasificationMaxRequestsPerMin(): number {
    return this.getNumber('gasification.maxRequestsPerMin');
  }

  getGasificationRequeryCooldownMinutes(): number {
    return this.getNumber('gasification.requeryCooldownMin');
  }

  // --- Admin API surface -----------------------------------------------------

  /** Catalog + current resolution state; secret values are never included. */
  describe(): ConfigDescription[] {
    return CONFIG_CATALOG.map((entry) => {
      const isSet = this.cache.has(entry.key);
      const envValue = this.config.raw(entry.envKey);
      const source: ConfigDescription['source'] = isSet
        ? 'db'
        : envValue !== undefined && envValue !== ''
          ? 'env'
          : 'unset';
      const base = {
        key: entry.key,
        group: entry.group,
        valueType: entry.valueType,
        isSecret: entry.isSecret,
        label: entry.label,
        help: entry.help,
        isSet,
        source,
      };
      // Secrets never expose the value; non-secrets return the effective value.
      return entry.isSecret ? base : { ...base, value: this.resolve(entry.key) };
    });
  }

  /** Set (validate → encrypt if secret → upsert → invalidate → audit-friendly return). */
  async set(key: string, rawValue: string, userId: string | null): Promise<void> {
    const entry = this.entry(key);
    const normalized = validateOrThrow(entry, rawValue);
    if (entry.isSecret && !this.encryption.available) {
      throw new BadRequestException(
        'CONFIG_ENCRYPTION_KEY belum diset — tidak bisa menyimpan nilai rahasia.',
      );
    }
    const stored = entry.isSecret ? this.encryption.encrypt(normalized) : normalized;
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: stored,
        isSecret: entry.isSecret,
        valueType: entry.valueType,
        group: entry.group,
        updatedById: userId,
      },
      update: { value: stored, updatedById: userId },
    });
    this.cache.set(key, stored);
    await this.publishChange();
  }

  /** Clear the DB override so the key falls back to env/default. */
  async clear(key: string): Promise<void> {
    this.entry(key);
    await this.prisma.systemConfig.deleteMany({ where: { key } });
    this.cache.delete(key);
    await this.publishChange();
  }

  // --- Cache coherence -------------------------------------------------------

  private async reload(): Promise<void> {
    try {
      const rows = await this.prisma.systemConfig.findMany({
        where: { value: { not: null } },
        select: { key: true, value: true },
      });
      const next = new Map<string, string>();
      for (const r of rows) {
        if (r.value !== null && CONFIG_BY_KEY.has(r.key)) next.set(r.key, r.value);
      }
      this.cache = next;
    } catch (err) {
      this.logger.warn(`system_config reload failed: ${String(err)}`);
    }
  }

  private subscribeForInvalidation(): void {
    try {
      this.subscriber = new Redis(this.config.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
      });
      this.subscriber.on('error', (e) => this.logger.warn(`config sub Redis: ${e.message}`));
      void this.subscriber.connect().then(async () => {
        await this.subscriber?.subscribe(CHANGE_CHANNEL);
        this.subscriber?.on('message', () => void this.reload().then(() => this.fireListeners()));
      });
    } catch (err) {
      this.logger.warn(`config subscribe failed (degrading to TTL reload): ${String(err)}`);
    }
  }

  /**
   * Broadcast a change so every instance (incl. this one) reloads. Best-effort —
   * published on the CacheService client (a subscribed connection can't publish).
   * The local cache is already updated synchronously by set()/clear().
   */
  private async publishChange(): Promise<void> {
    await this.redis.publish(CHANGE_CHANNEL, { at: Date.now() });
    this.fireListeners();
  }

  private fireListeners(): void {
    this.onChangeListeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        this.logger.warn(`config change listener failed: ${String(err)}`);
      }
    });
  }

  /** Local in-process listeners (e.g. jobs re-registering their intervals). */
  private readonly onChangeListeners = new Set<() => void>();
  onChange(listener: () => void): void {
    this.onChangeListeners.add(listener);
  }

  private entry(key: string): ConfigCatalogEntry {
    const entry = CONFIG_BY_KEY.get(key);
    if (!entry) throw new BadRequestException(`Setelan tidak dikenal: ${key}`);
    return entry;
  }
}

function coerce(raw: string, type: ConfigValueType): string | number | boolean {
  if (type === 'number') return Number(raw);
  if (type === 'boolean') return raw === 'true';
  return raw;
}

function validateOrThrow(entry: ConfigCatalogEntry, rawValue: string): string {
  try {
    return entry.validate(rawValue);
  } catch (err) {
    throw new BadRequestException(err instanceof Error ? err.message : 'Nilai tidak valid.');
  }
}
