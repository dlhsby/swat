import { GpsEfficiencyReadService } from './gps-efficiency-read.service';
import { type GpsEfficiencyRepository } from './gps-efficiency.repository';

const dec = (n: number): { toNumber: () => number } => ({ toNumber: () => n });

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    date: new Date('2026-06-25T00:00:00Z'),
    vehicleId: 'v1',
    plate: 'L 1',
    positionSource: 'gps',
    plannedMeters: 5000,
    actualMeters: 8000,
    adherencePct: null,
    dwellMinutes: null,
    lateMinutes: 20,
    wastedFuelLiters: dec(0.6),
    gpsidFuelLiters: null,
    deviationCount: 2,
    ...overrides,
  };
}

describe('GpsEfficiencyReadService', () => {
  let repo: { efficiencyRows: jest.Mock; deviceStatusCounts: jest.Mock };
  let service: GpsEfficiencyReadService;

  beforeEach(() => {
    repo = {
      efficiencyRows: jest
        .fn()
        .mockResolvedValue([
          row(),
          row({
            vehicleId: 'v2',
            plate: 'L 2',
            positionSource: 'recorded',
            actualMeters: 20000,
            lateMinutes: 0,
            wastedFuelLiters: dec(3.5),
            deviationCount: 0,
          }),
        ]),
      deviceStatusCounts: jest.fn().mockResolvedValue({ online: 8, offline: 2 }),
    };
    service = new GpsEfficiencyReadService(repo as unknown as GpsEfficiencyRepository);
  });

  it('aggregates fleet KPIs across tracked + untracked rows', async () => {
    const { kpis, rows } = await service.dashboard(new Date('2026-06-01'), new Date('2026-06-30'));
    expect(kpis.wastedFuelLiters).toBe(4.1);
    expect(kpis.lateMinutes).toBe(20);
    expect(kpis.deviationCount).toBe(2);
    expect(kpis.distanceKm).toBe(28); // (8000 + 20000) / 1000
    expect(kpis.gpsCoverageRate).toBe(0.5); // 1 of 2 rows tracked
    expect(kpis.deviceOffline).toBe(2);
    expect(kpis.deviceOfflineRate).toBe(0.2); // 2 / 10
    expect(kpis.adherencePct).toBeNull(); // none measured yet
    expect(kpis.gpsidFuelLiters).toBeNull();
    expect(rows).toHaveLength(2);
  });

  it('averages adherence over only the rows that have it', async () => {
    repo.efficiencyRows.mockResolvedValue([
      row({ adherencePct: dec(90) }),
      row({ vehicleId: 'v2', adherencePct: dec(80) }),
      row({ vehicleId: 'v3', adherencePct: null }),
    ]);
    const { kpis } = await service.dashboard(new Date('2026-06-01'), new Date('2026-06-30'));
    expect(kpis.adherencePct).toBe(85);
  });
});
