import { get as httpsGet, Agent } from 'node:https';

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { wibDayRangeUtc } from '../../../common/dates';
import { SystemConfigService } from '../../../config';

import { type GasificationRecord, type PtsiRawRecord, normalizePlate } from './gasification.types';

/** Bounded response cap so a rogue/huge payload can't exhaust memory. */
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

/** Downloaded photo bytes + its content type. */
export interface DownloadedPhoto {
  readonly body: Buffer;
  readonly contentType: string;
}

/**
 * PTSI gasification API client. Both PTSI hosts serve self-signed certificates, so
 * every request goes through an Agent with `rejectUnauthorized: false` (scoped to
 * these calls — never global). Credentials (base URL + `X-API-KEY`) resolve from
 * {@link SystemConfigService} (DB → env → default); when the key is unset the client
 * is "unconfigured" and callers no-op rather than erroring.
 */
@Injectable()
export class GasificationClientService {
  private readonly logger = new Logger(GasificationClientService.name);
  // Reused across calls so we don't spin up a TLS agent per request.
  private readonly insecureAgent = new Agent({ rejectUnauthorized: false, keepAlive: true });

  constructor(private readonly systemConfig: SystemConfigService) {}

  /** True when an API key is configured (the sync job/endpoints gate on this). */
  get isConfigured(): boolean {
    return this.systemConfig.getGasificationCredentials() !== null;
  }

  /**
   * Fetch the gasification records PTSI has for a WIB date (`YYYY-MM-DD`), optionally
   * narrowed to one plate. Returns canonical records; malformed rows are dropped
   * (logged), never thrown, so one bad row can't abort a whole sync.
   */
  async fetchByDate(dateKey: string, nopol?: string): Promise<GasificationRecord[]> {
    const creds = this.systemConfig.getGasificationCredentials();
    if (!creds) {
      return [];
    }
    const url = new URL('/Api/cari', creds.baseUrl);
    url.searchParams.set('tanggal', dateKey);
    if (nopol) {
      url.searchParams.set('nopol', nopol);
    }

    const payload = await this.getJson(url.toString(), { 'X-API-KEY': creds.apiKey });
    const rows = Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: PtsiRawRecord[] }).data ?? [])
      : [];
    return rows.flatMap((raw) => {
      const record = this.toRecord(raw);
      return record ? [record] : [];
    });
  }

  /** Download a gasification photo by its filename. null on any fetch/HTTP failure. */
  async downloadPhoto(fotoFilename: string): Promise<DownloadedPhoto | null> {
    const base = this.systemConfig.getGasificationPhotoBaseUrl();
    const url = new URL(fotoFilename, base.endsWith('/') ? base : `${base}/`).toString();
    try {
      return await this.getBinary(url);
    } catch (err) {
      this.logger.warn(`Gasification photo download failed for ${fotoFilename}: ${String(err)}`);
      return null;
    }
  }

  /** Normalize one raw PTSI row into a canonical record, or null if unusable. */
  private toRecord(raw: PtsiRawRecord): GasificationRecord | null {
    const vendorNopol = typeof raw.nopol === 'string' ? raw.nopol.trim() : '';
    const plateNumber = normalizePlate(vendorNopol);
    const fotoFilename = typeof raw.foto === 'string' ? raw.foto.trim() : '';
    const dateKey = toDateKey(raw.tanggal_masuk);
    const enteredAt = dateKey ? toInstant(dateKey, raw.jam_masuk) : null;
    if (!plateNumber || !fotoFilename || !dateKey || !enteredAt) {
      this.logger.warn(`Skipping malformed PTSI record: ${JSON.stringify(raw)}`);
      return null;
    }
    return {
      vendorNopol,
      plateNumber,
      enteredAt,
      operationDate: new Date(`${dateKey}T00:00:00.000Z`),
      userTally: typeof raw.user_tally === 'string' ? raw.user_tally.trim() || null : null,
      fotoFilename,
      raw,
    };
  }

  private getJson(url: string, headers: Record<string, string>): Promise<unknown> {
    return this.request(url, headers, 'json') as Promise<unknown>;
  }

  private getBinary(url: string): Promise<DownloadedPhoto> {
    return this.request(url, {}, 'binary') as Promise<DownloadedPhoto>;
  }

  /**
   * Single insecure-TLS GET. Buffers the body (capped), enforces a timeout, and
   * rejects on non-2xx. Returns parsed JSON or `{ body, contentType }` for binary.
   */
  private request(
    url: string,
    headers: Record<string, string>,
    mode: 'json' | 'binary',
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const req = httpsGet(url, { agent: this.insecureAgent, headers }, (res) => {
        const status = res.statusCode ?? 0;
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            req.destroy();
            reject(new ServiceUnavailableException('Respons PTSI melebihi batas ukuran.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          if (status < 200 || status >= 300) {
            reject(new ServiceUnavailableException(`PTSI menjawab HTTP ${status}.`));
            return;
          }
          const body = Buffer.concat(chunks);
          if (mode === 'binary') {
            resolve({ body, contentType: res.headers['content-type'] ?? 'image/jpeg' });
            return;
          }
          try {
            resolve(JSON.parse(body.toString('utf8')));
          } catch {
            reject(new ServiceUnavailableException('Respons PTSI bukan JSON yang valid.'));
          }
        });
      });
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy();
        reject(new ServiceUnavailableException('Permintaan ke PTSI melebihi batas waktu.'));
      });
      req.on('error', (err) => reject(err));
    });
  }
}

/** Parse a PTSI date string into a `YYYY-MM-DD` key. Accepts ISO or `DD-MM-YYYY`
 *  (with optional trailing time). Returns null when it isn't a recognizable date. */
export function toDateKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const datePart = value.trim().split(/[ T]/)[0] ?? '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (iso) {
    return datePart;
  }
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(datePart);
  if (dmy) {
    const d = dmy[1] ?? '';
    const m = dmy[2] ?? '';
    const y = dmy[3] ?? '';
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Combine a WIB date key + a `HH:MM[:SS]` time-of-day into the corresponding UTC
 * instant. The day's UTC-midnight anchor comes from {@link wibDayRangeUtc}; the
 * wall-clock offset is added on top. Defaults to 00:00:00 when the time is unparsable.
 */
export function toInstant(dateKey: string, time: unknown): Date {
  const start = wibDayRangeUtc(dateKey).start.getTime();
  const match =
    typeof time === 'string' ? /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(time.trim()) : null;
  const h = match ? Math.min(23, Number(match[1])) : 0;
  const m = match ? Math.min(59, Number(match[2])) : 0;
  const s = match?.[3] ? Math.min(59, Number(match[3])) : 0;
  return new Date(start + (h * 3600 + m * 60 + s) * 1000);
}
