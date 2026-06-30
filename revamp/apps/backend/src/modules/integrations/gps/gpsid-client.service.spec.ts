import { ServiceUnavailableException } from '@nestjs/common';

import { type AppConfigService } from '../../../config/config.service';
import { type CacheService } from '../../cache/cache.service';

import { GpsidClientService } from './gpsid-client.service';

const CREDS = { baseUrl: 'https://gps.id/api', username: 'swat', password: 'secret' };

function jsonResponse(data: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => data,
  } as unknown as Response;
}

describe('GpsidClientService', () => {
  let config: { gpsidPullCredentials: typeof CREDS | null };
  let cache: { increment: jest.Mock };
  let fetchMock: jest.Mock;
  let service: GpsidClientService;

  beforeEach(() => {
    config = { gpsidPullCredentials: { ...CREDS } };
    cache = { increment: jest.fn().mockResolvedValue(1) };
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    service = new GpsidClientService(
      config as unknown as AppConfigService,
      cache as unknown as CacheService,
    );
  });

  /** Wrap a payload in the GPS.id success envelope `{ status:true, message:{ data } }`. */
  function envelope(data: unknown): unknown {
    return { status: true, message: { data } };
  }

  /** Default happy path: /login returns a token; data endpoints return enveloped `data`. */
  function wireFetch(data: unknown): void {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        String(url).endsWith('/login')
          ? jsonResponse(envelope({ token: 'tok-1' }))
          : jsonResponse(envelope(data)),
      ),
    );
  }

  it('reports whether the pull API is configured', () => {
    expect(service.isConfigured).toBe(true);
    config.gpsidPullCredentials = null;
    expect(service.isConfigured).toBe(false);
  });

  it('logs in then maps the vehicle list', async () => {
    wireFetch([{ imei: '350000000000001', plate: 'L 1 AB' }]);
    const vehicles = await service.getVehicles();
    expect(vehicles).toEqual([{ imei: '350000000000001', plate: 'L 1 AB' }]);
    expect(fetchMock).toHaveBeenCalledWith('https://gps.id/api/login', expect.anything());
  });

  it('caches the token across calls (logs in once)', async () => {
    wireFetch([]);
    await service.getVehicles();
    await service.getVehicles();
    const logins = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/login'));
    expect(logins).toHaveLength(1);
  });

  it('re-logs in and retries once on a 401', async () => {
    let getCalls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (String(url).endsWith('/login')) {
        return Promise.resolve(jsonResponse(envelope({ token: 'tok' })));
      }
      getCalls += 1;
      return Promise.resolve(
        getCalls === 1 ? jsonResponse(null, { ok: false, status: 401 }) : jsonResponse(envelope([])),
      );
    });
    await expect(service.getVehicles()).resolves.toEqual([]);
    const logins = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/login'));
    expect(logins).toHaveLength(2); // initial + refresh after 401
  });

  it('maps mileage including used_fuel_total', async () => {
    wireFetch([{ imei: '350000000000001', used_fuel_total: 12.5, mileage: 80 }]);
    const mileage = await service.getMileage(['350000000000001'], '2026-06-24');
    expect(mileage).toEqual([{ imei: '350000000000001', usedFuelLiters: 12.5, distanceKm: 80 }]);
  });

  it('rejects a mileage batch over the per-call IMEI cap', async () => {
    await expect(service.getMileage(['1', '2', '3', '4', '5', '6'], '2026-06-24')).rejects.toThrow(
      /at most 5/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails loudly when the pull API is not configured', async () => {
    config.gpsidPullCredentials = null;
    await expect(service.getVehicles()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when the vendor rate limit is reached', async () => {
    cache.increment.mockResolvedValue(6);
    await expect(service.getVehicles()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when login fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(null, { ok: false, status: 503 }));
    await expect(service.getVehicles()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when login returns no token', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(String(url).endsWith('/login') ? jsonResponse({}) : jsonResponse([])),
    );
    await expect(service.getVehicles()).rejects.toThrow(/no token/);
  });

  it('fetches breadcrumb history with the device/start/end query', async () => {
    wireFetch([{ lat: -7.25, lon: 112.75, speed: 30, time: '2026-06-24 08:00:00' }]);
    const history = await service.getHistory('350000000000001', '2026-06-24', '2026-06-25');
    expect(history).toEqual([
      { latitude: -7.25, longitude: 112.75, speedKmh: 30, recordedAt: '2026-06-24 08:00:00' },
    ]);
    const historyCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('report/history'),
    );
    const url = decodeURIComponent(String(historyCall?.[0]));
    expect(url).toContain('device=350000000000001');
    // A date-only arg must widen to the full vendor `YYYY-MM-DD HH:MM:SS` window
    // (URLSearchParams encodes the space as '+', decoded to a space server-side).
    expect(url).toContain('start=2026-06-24+00:00:00');
    expect(url).toContain('end=2026-06-25+23:59:59');
  });

  it('returns [] for an empty mileage batch without calling the vendor', async () => {
    wireFetch([]);
    await expect(service.getMileage([], '2026-06-24')).resolves.toEqual([]);
    const mileageCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('report/mileage'),
    );
    expect(mileageCalls).toHaveLength(0);
  });

  it('sends the mileage device as a JSON array and a full-day window', async () => {
    wireFetch([]);
    await service.getMileage(['350000000000001', '350000000000002'], '2026-06-24');
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('report/mileage'));
    const url = decodeURIComponent(String(call?.[0]));
    expect(url).toContain('device=["350000000000001","350000000000002"]');
    // URLSearchParams encodes the space in the timestamp as '+' (decoded to a space server-side).
    expect(url).toContain('start=2026-06-24+00:00:00');
    expect(url).toContain('end=2026-06-24+23:59:59');
  });

  it('maps the vehicle list from /vehicle (not get-vehicle)', async () => {
    wireFetch([]);
    await service.getVehicles();
    const call = fetchMock.mock.calls.find(([url]) => !String(url).endsWith('/login'));
    expect(String(call?.[0])).toMatch(/\/vehicle$/);
  });
});
