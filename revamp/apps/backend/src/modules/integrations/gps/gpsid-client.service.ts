import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../config/config.service';
import { CacheService } from '../../cache/cache.service';

/** Bearer token cached in-memory until just before its 24h expiry. */
interface CachedToken {
  readonly token: string;
  readonly expiresAt: number;
}

export interface GpsidVehicle {
  readonly imei: string;
  readonly plate: string | null;
}

export interface GpsidHistoryPoint {
  readonly latitude: number;
  readonly longitude: number;
  readonly speedKmh: number;
  readonly recordedAt: string;
}

export interface GpsidMileage {
  readonly imei: string;
  readonly usedFuelLiters: number;
  readonly distanceKm: number;
}

/** GPS.id token lifetime is 24h; refresh a minute early to avoid edge expiry. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 - 60_000;
/** Vendor pull limit is ~5 requests / 5 min — enforced so nightly jobs never burst. */
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 5 * 60;
const MAX_IMEIS_PER_CALL = 5;

/**
 * GPS.id pull-API client (Phase 7, T-707) — the SECONDARY path, used only by the
 * nightly backfill + mileage reconcile (Epic 7.6). Credentials come from config
 * (env-only; fail loudly if missing — never an unauthenticated call). Caches the
 * 24h bearer (re-logs in on expiry or a 401) and self-throttles to the vendor's
 * ~5 req/5 min ceiling via a shared Redis counter. HTTP is mocked in tests.
 */
@Injectable()
export class GpsidClientService {
  private cachedToken: CachedToken | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly cache: CacheService,
  ) {}

  /** Whether the nightly pull is configured at all (all creds present). */
  get isConfigured(): boolean {
    return this.config.gpsidPullCredentials !== null;
  }

  async getVehicles(): Promise<GpsidVehicle[]> {
    const raw = await this.authedGet<Array<Record<string, unknown>>>('get-vehicle');
    return (raw ?? []).map((v) => ({
      imei: String(v.imei ?? v.VehicleId ?? ''),
      plate: typeof v.plate === 'string' ? v.plate : ((v.VehicleNumber as string) ?? null),
    }));
  }

  async getHistory(imei: string, fromIso: string, toIso: string): Promise<GpsidHistoryPoint[]> {
    const query = new URLSearchParams({ imei, from: fromIso, to: toIso }).toString();
    const raw = await this.authedGet<Array<Record<string, unknown>>>(`report/history?${query}`);
    return (raw ?? []).map((p) => ({
      latitude: Number(p.lat ?? p.Lat ?? 0),
      longitude: Number(p.lon ?? p.Lon ?? 0),
      speedKmh: Number(p.speed ?? p.Speed ?? 0),
      recordedAt: String(p.datetime ?? p.DatetimeUTC ?? ''),
    }));
  }

  /**
   * Mileage + used fuel per device for a date (the nightly internal-vs-vendor
   * cross-check). Capped at {@link MAX_IMEIS_PER_CALL} IMEIs per call to respect
   * the vendor batch limit.
   */
  async getMileage(imeis: readonly string[], dateIso: string): Promise<GpsidMileage[]> {
    if (imeis.length > MAX_IMEIS_PER_CALL) {
      throw new Error(`GPS.id mileage: at most ${MAX_IMEIS_PER_CALL} IMEIs per call.`);
    }
    const query = new URLSearchParams({ imei: imeis.join(','), date: dateIso }).toString();
    const raw = await this.authedGet<Array<Record<string, unknown>>>(`report/mileage?${query}`);
    return (raw ?? []).map((m) => ({
      imei: String(m.imei ?? m.VehicleId ?? ''),
      usedFuelLiters: Number(m.used_fuel_total ?? m.usedFuel ?? 0),
      distanceKm: Number(m.mileage ?? m.distance ?? 0),
    }));
  }

  // --- internals ------------------------------------------------------------

  private creds(): { baseUrl: string; username: string; password: string } {
    const creds = this.config.gpsidPullCredentials;
    if (!creds) {
      // Fail loudly — never issue an unauthenticated pull or silently no-op.
      throw new ServiceUnavailableException(
        'GPS.id pull API is not configured (GPSID_BASE_URL / GPSID_USERNAME / GPSID_PASSWORD).',
      );
    }
    return creds;
  }

  private async ensureToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }
    const { baseUrl, username, password } = this.creds();
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      throw new ServiceUnavailableException(`GPS.id login failed (${res.status}).`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const token = (json.access_token ?? json.token ?? json.Token) as string | undefined;
    if (!token) {
      throw new ServiceUnavailableException('GPS.id login returned no token.');
    }
    this.cachedToken = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return token;
  }

  /** Self-throttle to the vendor ceiling. Fail-open if Redis is down (count 0). */
  private async guardRateLimit(): Promise<void> {
    const count = await this.cache.increment('gpsid:pull:rl', RATE_WINDOW_SECONDS);
    if (count > RATE_LIMIT) {
      throw new ServiceUnavailableException(
        `GPS.id pull rate limit reached (${RATE_LIMIT}/${RATE_WINDOW_SECONDS}s) — try later.`,
      );
    }
  }

  private async authedGet<T>(path: string): Promise<T> {
    await this.guardRateLimit();
    const { baseUrl } = this.creds();
    let token = await this.ensureToken();
    let res = await fetch(`${baseUrl}/${path}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    // A 401 means the cached token went stale early — re-login once and retry.
    if (res.status === 401) {
      token = await this.ensureToken(true);
      res = await fetch(`${baseUrl}/${path}`, { headers: { authorization: `Bearer ${token}` } });
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`GPS.id ${path} failed (${res.status}).`);
    }
    return (await res.json()) as T;
  }
}
