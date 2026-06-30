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
/** History breadcrumbs are paginated; pull a single generous page (no consumer pages yet). */
const HISTORY_PAGE_SIZE = 1000;

/**
 * Coerce a date or ISO datetime to the vendor's required `YYYY-MM-DD HH:MM:SS`
 * stamp. A date-only value takes {@link fallbackTime} (so a day range becomes a
 * valid `start < end` window); a full ISO keeps its own time (`T`→space).
 */
function toVendorStamp(value: string, fallbackTime: string): string {
  const date = value.slice(0, 10);
  const time = value.length > 10 ? value.slice(11, 19) : fallbackTime;
  return `${date} ${time}`;
}

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
    // GET /vehicle → message.data[] of { imei, plate, ... }.
    const raw = await this.authedGet<Array<Record<string, unknown>>>('vehicle');
    return (raw ?? []).map((v) => ({
      imei: String(v.imei ?? ''),
      plate: typeof v.plate === 'string' ? v.plate : null,
    }));
  }

  async getHistory(imei: string, startIso: string, endIso: string): Promise<GpsidHistoryPoint[]> {
    // GET /report/history?device=<imei>&start=<>&end=<> → message.data[] of
    // { lat, lon, speed, time, ... }. Single page, large window (no consumer paginates yet).
    // The vendor requires the `YYYY-MM-DD HH:MM:SS` stamp; a date-only arg widens
    // to the full day (start→00:00:00, end→23:59:59) so `start < end` holds.
    const query = new URLSearchParams({
      page: '1',
      per_page: String(HISTORY_PAGE_SIZE),
      device: imei,
      start: toVendorStamp(startIso, '00:00:00'),
      end: toVendorStamp(endIso, '23:59:59'),
    }).toString();
    const raw = await this.authedGet<Array<Record<string, unknown>>>(`report/history?${query}`);
    return (raw ?? []).map((p) => ({
      latitude: Number(p.lat ?? 0),
      longitude: Number(p.lon ?? 0),
      speedKmh: Number(p.speed ?? 0),
      recordedAt: String(p.time ?? ''),
    }));
  }

  /**
   * Mileage + used fuel per device for a date (the nightly internal-vs-vendor
   * cross-check). Capped at {@link MAX_IMEIS_PER_CALL} IMEIs per call to respect
   * the vendor batch limit. `device` is a JSON array string; the window is the
   * whole calendar day (the vendor rejects `start >= end`).
   */
  async getMileage(imeis: readonly string[], dateIso: string): Promise<GpsidMileage[]> {
    if (imeis.length === 0) {
      return [];
    }
    if (imeis.length > MAX_IMEIS_PER_CALL) {
      throw new Error(`GPS.id mileage: at most ${MAX_IMEIS_PER_CALL} IMEIs per call.`);
    }
    const query = new URLSearchParams({
      device: JSON.stringify([...imeis]),
      start: `${dateIso} 00:00:00`,
      end: `${dateIso} 23:59:59`,
    }).toString();
    const raw = await this.authedGet<Array<Record<string, unknown>>>(`report/mileage?${query}`);
    return (raw ?? []).map((m) => ({
      imei: String(m.imei ?? ''),
      usedFuelLiters: Number(m.used_fuel_total ?? 0),
      distanceKm: Number(m.mileage ?? 0),
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
    // Envelope: { status:true, message:{ data:{ token, ... } } }; token is a 24h JWT.
    const json = (await res.json()) as { message?: { data?: { token?: unknown } } };
    const token = json.message?.data?.token;
    if (typeof token !== 'string' || token.length === 0) {
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
    // Success envelope: { status:true, message:{ data } }. A 200 can still carry
    // { status:false, message:"<reason>" } — surface that rather than mis-parsing it.
    const json = (await res.json()) as {
      status?: boolean;
      message?: { data?: unknown } | string;
    };
    if (json.status === false || typeof json.message === 'string') {
      const reason = typeof json.message === 'string' ? json.message : 'request failed';
      throw new ServiceUnavailableException(`GPS.id ${path} failed: ${reason}`);
    }
    return (json.message?.data ?? null) as T;
  }
}
