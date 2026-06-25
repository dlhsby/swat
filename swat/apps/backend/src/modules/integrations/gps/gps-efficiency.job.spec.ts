import { GpsEfficiencyJob } from './gps-efficiency.job';
import { type GpsEfficiencyRepository } from './gps-efficiency.repository';
import { type GpsEfficiencyService } from './gps-efficiency.service';
import { type GpsidClientService } from './gpsid-client.service';

const DATE = new Date('2026-06-24T00:00:00Z');

describe('GpsEfficiencyJob.reconcileFuel', () => {
  let efficiency: { refreshForDate: jest.Mock };
  let repo: { activeDeviceImeis: jest.Mock; updateGpsidFuel: jest.Mock };
  let gpsid: { isConfigured: boolean; getMileage: jest.Mock };
  let job: GpsEfficiencyJob;

  beforeEach(() => {
    jest.clearAllMocks();
    efficiency = { refreshForDate: jest.fn().mockResolvedValue(0) };
    repo = {
      activeDeviceImeis: jest
        .fn()
        .mockResolvedValue([{ imei: '350000000000001', vehicleId: 'v1' }]),
      updateGpsidFuel: jest.fn().mockResolvedValue(undefined),
    };
    gpsid = { isConfigured: false, getMileage: jest.fn() };
    job = new GpsEfficiencyJob(
      efficiency as unknown as GpsEfficiencyService,
      repo as unknown as GpsEfficiencyRepository,
      gpsid as unknown as GpsidClientService,
    );
  });

  it('no-ops cleanly when GPS.id is not configured', async () => {
    await job.reconcileFuel(DATE);
    expect(gpsid.getMileage).not.toHaveBeenCalled();
    expect(repo.updateGpsidFuel).not.toHaveBeenCalled();
  });

  it('pulls mileage and stores the cross-check when configured', async () => {
    gpsid.isConfigured = true;
    gpsid.getMileage.mockResolvedValue([
      { imei: '350000000000001', usedFuelLiters: 12.5, distanceKm: 80 },
    ]);
    await job.reconcileFuel(DATE);
    expect(gpsid.getMileage).toHaveBeenCalledWith(['350000000000001'], '2026-06-24');
    expect(repo.updateGpsidFuel).toHaveBeenCalledWith(DATE, 'v1', 12.5);
  });

  it('survives a vendor error for a batch', async () => {
    gpsid.isConfigured = true;
    gpsid.getMileage.mockRejectedValue(new Error('429'));
    await expect(job.reconcileFuel(DATE)).resolves.toBeUndefined();
    expect(repo.updateGpsidFuel).not.toHaveBeenCalled();
  });
});
