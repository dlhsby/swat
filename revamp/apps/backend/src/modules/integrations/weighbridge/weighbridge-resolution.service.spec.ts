import { BadRequestException, NotFoundException } from '@nestjs/common';

import { WeighbridgeResolutionService } from './weighbridge-resolution.service';
import {
  type PermitWithVehicleAndSite,
  type WeighbridgeRepository,
} from './weighbridge.repository';

function buildPermit(overrides: Partial<PermitWithVehicleAndSite> = {}): PermitWithVehicleAndSite {
  return {
    id: '00000000-0000-0000-0000-0000000000d1',
    legacyId: null,
    code: 'KT-202606-0042',
    vehicleId: '00000000-0000-0000-0000-0000000000e1',
    siteId: '00000000-0000-0000-0000-0000000000f1',
    status: 'ACTIVE',
    issuedAt: new Date('2026-01-01T00:00:00Z'),
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTo: new Date('2026-12-31T00:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: null,
    updatedById: null,
    deletedAt: null,
    deletedById: null,
    site: { id: '00000000-0000-0000-0000-0000000000f1', name: 'TPA Benowo', type: 'TPA' } as never,
    vehicle: {
      id: '00000000-0000-0000-0000-0000000000e1',
      plateNumber: 'L-1234-AB',
      status: 'GOOD',
      currentTareWeight: 4200,
      model: { brand: 'Hino', normalTareWeight: 4200, maxNetLoad: 8000, maxNetVolume: 12 },
    } as never,
    ...overrides,
  } as PermitWithVehicleAndSite;
}

describe('WeighbridgeResolutionService', () => {
  let repo: {
    findActivePermitByCode: jest.Mock;
    findActivePermitByPlate: jest.Mock;
    findActivePermitById: jest.Mock;
  };
  let service: WeighbridgeResolutionService;

  beforeEach(() => {
    repo = {
      findActivePermitByCode: jest.fn(),
      findActivePermitByPlate: jest.fn(),
      findActivePermitById: jest.fn(),
    };
    service = new WeighbridgeResolutionService(repo as unknown as WeighbridgeRepository);
  });

  it('requires code or plateNumber', async () => {
    await expect(service.resolveKitir({}, '2026-06-05')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid date', async () => {
    await expect(
      service.resolveKitir({ code: 'KT-202606-0042' }, 'not-a-date'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves by code with full vehicle specs', async () => {
    repo.findActivePermitByCode.mockResolvedValue(buildPermit());
    const result = await service.resolveKitir({ code: 'KT-202606-0042' }, '2026-06-05');
    expect(result.plateNumber).toBe('L-1234-AB');
    expect(result.siteName).toBe('TPA Benowo');
    expect(result.vehicle).toMatchObject({ brand: 'Hino', maxNetLoad: 8000, maxNetVolume: 12 });
    expect(result.validFrom).toBe('2026-01-01');
  });

  it('resolves by plate', async () => {
    repo.findActivePermitByPlate.mockResolvedValue(buildPermit());
    const result = await service.resolveKitir({ plateNumber: 'L-1234-AB' }, '2026-06-05');
    expect(result.id).toBe('00000000-0000-0000-0000-0000000000d1');
    expect(repo.findActivePermitByPlate).toHaveBeenCalled();
  });

  it('404s when no active permit is found', async () => {
    repo.findActivePermitByCode.mockResolvedValue(null);
    await expect(service.resolveKitir({ code: 'MISSING' }, '2026-06-05')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404s when the vehicle is not operational', async () => {
    repo.findActivePermitByCode.mockResolvedValue(
      buildPermit({ vehicle: { ...buildPermit().vehicle, status: 'MAJOR_DAMAGE' } as never }),
    );
    await expect(
      service.resolveKitir({ code: 'KT-202606-0042' }, '2026-06-05'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('coerces null model capacities to 0', async () => {
    repo.findActivePermitByCode.mockResolvedValue(
      buildPermit({
        vehicle: {
          ...buildPermit().vehicle,
          model: { brand: 'Hino', normalTareWeight: 4200, maxNetLoad: null, maxNetVolume: null },
        } as never,
      }),
    );
    const result = await service.resolveKitir({ code: 'KT-202606-0042' }, '2026-06-05');
    expect(result.vehicle.maxNetLoad).toBe(0);
    expect(result.vehicle.maxNetVolume).toBe(0);
  });
});
