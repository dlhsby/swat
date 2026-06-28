import { type AppConfigService } from '../../../config/config.service';

import { type VehiclePositionRepository } from './vehicle-position.repository';
import { VehiclePositionService } from './vehicle-position.service';

const NOW = new Date('2026-06-25T10:00:00Z');
const dec = (n: number): { toNumber: () => number } => ({ toNumber: () => n });

function device(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    status: 'online',
    lastPingAt: new Date(NOW.getTime() - 2 * 60_000), // fresh
    lastLat: dec(-7.25),
    lastLng: dec(112.75),
    lastSpeedKmh: dec(18),
    lastHeading: 90,
    ...overrides,
  };
}

function vehicle(id: string, plate: string, devices: unknown[]): Record<string, unknown> {
  return { id, plateNumber: plate, gpsDevices: devices };
}

function leg(
  vehicleId: string,
  opts: { actual?: Date | null; site?: string },
): Record<string, unknown> {
  return {
    name: 'leg',
    actualTime: opts.actual ?? null,
    targetTime: new Date(NOW.getTime() - 30 * 60_000),
    status: 'IN_PROGRESS',
    haulAssignment: { haul: { vehicleId } },
    route: {
      destinationSite: {
        name: opts.site ?? 'TPA Benowo',
        latitude: dec(-7.3),
        longitude: dec(112.8),
      },
    },
  };
}

describe('VehiclePositionService', () => {
  let repo: { vehiclesWithDevice: jest.Mock; recordedActivity: jest.Mock; recentTrack: jest.Mock };
  let service: VehiclePositionService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      vehiclesWithDevice: jest.fn().mockResolvedValue([]),
      recordedActivity: jest.fn().mockResolvedValue([]),
      recentTrack: jest.fn().mockResolvedValue([]),
    };
    const config = { gps: { deviceOfflineMinutes: 10 } } as unknown as AppConfigService;
    service = new VehiclePositionService(repo as unknown as VehiclePositionRepository, config);
  });

  it('reports a fresh GPS device as live-gps online', async () => {
    repo.vehiclesWithDevice.mockResolvedValue([vehicle('v1', 'L 1', [device()])]);
    const [pos] = await service.fleetPositions(NOW);
    expect(pos).toMatchObject({
      source: 'live-gps',
      status: 'online',
      latitude: -7.25,
      speedKmh: 18,
    });
  });

  it('keeps a stale device as live-gps OFFLINE at its last-known position', async () => {
    repo.vehiclesWithDevice.mockResolvedValue([
      vehicle('v1', 'L 1', [device({ lastPingAt: new Date(NOW.getTime() - 30 * 60_000) })]),
    ]);
    const [pos] = await service.fleetPositions(NOW);
    expect(pos).toMatchObject({ source: 'live-gps', status: 'offline', latitude: -7.25 });
  });

  it('omits a GPS vehicle with no fix today', async () => {
    repo.vehiclesWithDevice.mockResolvedValue([
      vehicle('v1', 'L 1', [device({ lastLat: null, lastLng: null, lastPingAt: null })]),
    ]);
    await expect(service.fleetPositions(NOW)).resolves.toEqual([]);
  });

  it('places an untracked vehicle from its latest realized leg', async () => {
    repo.vehiclesWithDevice.mockResolvedValue([vehicle('v2', 'L 2', [])]);
    repo.recordedActivity.mockResolvedValue([
      leg('v2', { actual: new Date(NOW.getTime() - 20 * 60_000), site: 'TPA Benowo' }),
    ]);
    const [pos] = await service.fleetPositions(NOW);
    expect(pos).toMatchObject({
      source: 'recorded-activity',
      status: null,
      latitude: -7.3,
      legLabel: 'TPA Benowo · tercatat',
    });
  });

  it('labels an in-progress (unrealized) leg as "heading to"', async () => {
    repo.vehiclesWithDevice.mockResolvedValue([vehicle('v2', 'L 2', [])]);
    repo.recordedActivity.mockResolvedValue([leg('v2', { actual: null, site: 'TPS Mawar' })]);
    const [pos] = await service.fleetPositions(NOW);
    expect(pos?.legLabel).toBe('Menuju TPS Mawar');
  });

  it('prefers a realized leg over a heading-to leg', async () => {
    repo.vehiclesWithDevice.mockResolvedValue([vehicle('v2', 'L 2', [])]);
    repo.recordedActivity.mockResolvedValue([
      leg('v2', { actual: new Date(NOW.getTime() - 5 * 60_000), site: 'Realized' }),
      leg('v2', { actual: null, site: 'HeadingTo' }),
    ]);
    const [pos] = await service.fleetPositions(NOW);
    expect(pos?.legLabel).toBe('Realized · tercatat');
  });

  it('omits an untracked vehicle with no activity', async () => {
    repo.vehiclesWithDevice.mockResolvedValue([vehicle('v3', 'L 3', [])]);
    await expect(service.fleetPositions(NOW)).resolves.toEqual([]);
  });

  it('maps a breadcrumb track', async () => {
    repo.recentTrack.mockResolvedValue([
      {
        latitude: dec(-7.25),
        longitude: dec(112.75),
        speedKmh: dec(20),
        heading: 90,
        recordedAt: NOW,
      },
    ]);
    const track = await service.track('v1', 60, NOW);
    expect(track).toEqual([
      {
        latitude: -7.25,
        longitude: 112.75,
        speedKmh: 20,
        heading: 90,
        recordedAt: NOW.toISOString(),
      },
    ]);
  });
});
