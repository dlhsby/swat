import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { type RolePermissionsService } from '../../../common/auth/role-permissions.service';
import { type SessionUser } from '../../../common/auth/session.types';
import { type RollupService } from '../../analytics/rollup.service';
import { type AuditService } from '../../audit/audit.service';

import { type TripsRepository } from './trips.repository';
import { TripsService } from './trips.service';

const USER: SessionUser = { id: 9, username: 'data', roleId: 2, mustChangePassword: false };

function buildTrip(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 10000n,
    haulAssignmentId: 1000n,
    routeId: 4,
    route: {
      id: 4,
      category: 'DISPOSAL',
      originSite: { name: 'TPS A' },
      destinationSite: { name: 'TPA B' },
    },
    recordedBy: null,
    verifiedBy: null,
    status: 'IN_PROGRESS',
    name: 'DISPOSAL: TPS A → TPA B',
    operationDate: new Date('2026-06-08T00:00:00Z'),
    targetTime: new Date('2026-06-08T06:00:00Z'),
    actualTime: null,
    targetOdometer: 12000,
    actualOdometer: 0,
    tareWeight: 8000,
    grossWeight: null,
    netWeight: null,
    wasteVolume: null,
    fuelRequestedLiters: null,
    fuelApprovedLiters: null,
    recordedById: null,
    verifiedById: null,
    verifiedAt: null,
    realizationEntryAt: null,
    createdAt: new Date('2026-06-08T03:00:00Z'),
    updatedAt: new Date('2026-06-08T03:00:00Z'),
    haulAssignment: {
      id: 1000n,
      departActualOdometer: 12010,
      haul: { vehicleId: 7, vehicle: { currentTareWeight: 8000, currentOdometer: 12010 } },
      trips: [{ id: 10000n, status: 'IN_PROGRESS', actualOdometer: 0, targetTime: null }],
    },
    ...overrides,
  };
}

describe('TripsService', () => {
  let repo: { findForRecording: jest.Mock; findFull: jest.Mock; update: jest.Mock };
  let rolePermissions: { getPermissionKeys: jest.Mock };
  let audit: { record: jest.Mock };
  let rollups: { refreshForOperationDate: jest.Mock };
  let service: TripsService;

  beforeEach(() => {
    repo = {
      findForRecording: jest.fn(),
      findFull: jest.fn(),
      update: jest.fn((_id, data) =>
        Promise.resolve(buildTrip({ ...data, route: buildTrip().route })),
      ),
    };
    rolePermissions = {
      getPermissionKeys: jest
        .fn()
        .mockResolvedValue([
          'trip:record-disposal',
          'trip:record-pickup',
          'trip:record-fuel',
          'trip:update',
        ]),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    rollups = { refreshForOperationDate: jest.fn().mockResolvedValue(undefined) };
    service = new TripsService(
      repo as unknown as TripsRepository,
      rolePermissions as unknown as RolePermissionsService,
      audit as unknown as AuditService,
      rollups as unknown as RollupService,
    );
  });

  const dispatch = { actualTime: '2026-06-08T07:00:00.000Z', actualOdometer: 12050 };

  it('404s an unknown trip', async () => {
    repo.findForRecording.mockResolvedValue(null);
    await expect(service.record('1', dispatch, USER)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('permissions', () => {
    it('rejects recording a verified trip without override', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip({ status: 'VERIFIED' }));
      await expect(service.record('10000', dispatch, USER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('allows recording a verified trip with trip:override', async () => {
      rolePermissions.getPermissionKeys.mockResolvedValue([
        'trip:override',
        'trip:record-disposal',
      ]);
      repo.findForRecording.mockResolvedValue(buildTrip({ status: 'VERIFIED' }));
      await service.record('10000', { ...dispatch, grossWeight: 12000 }, USER);
      // An override edit invalidates the verification: the trip drops back to DONE.
      expect(repo.update).toHaveBeenCalledWith(10000n, expect.objectContaining({ status: 'DONE' }));
    });

    it('rejects a category the user lacks permission for', async () => {
      rolePermissions.getPermissionKeys.mockResolvedValue(['trip:read']);
      repo.findForRecording.mockResolvedValue(buildTrip());
      await expect(
        service.record('10000', { ...dispatch, grossWeight: 12000 }, USER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('odometer chain', () => {
    it('rejects an odometer below the departure odometer', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip());
      await expect(
        service.record('10000', { ...dispatch, actualOdometer: 12009, grossWeight: 12000 }, USER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an odometer below a completed sibling trip', async () => {
      repo.findForRecording.mockResolvedValue(
        buildTrip({
          haulAssignment: {
            id: 1000n,
            departActualOdometer: 12010,
            haul: { vehicleId: 7, vehicle: { currentTareWeight: 8000, currentOdometer: 12010 } },
            trips: [
              { id: 9999n, status: 'DONE', actualOdometer: 12080, targetTime: null },
              { id: 10000n, status: 'IN_PROGRESS', actualOdometer: 0, targetTime: null },
            ],
          },
        }),
      );
      await expect(
        service.record('10000', { ...dispatch, actualOdometer: 12070, grossWeight: 12000 }, USER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('DISPOSAL weighing', () => {
    it('computes netWeight = gross − tare and marks DONE', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip());
      await service.record('10000', { ...dispatch, grossWeight: 12000 }, USER);
      expect(repo.update).toHaveBeenCalledWith(
        10000n,
        expect.objectContaining({
          status: 'DONE',
          grossWeight: 12000,
          tareWeight: 8000,
          netWeight: 4000,
        }),
      );
    });

    it('uses an overriding tare when supplied', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip());
      await service.record('10000', { ...dispatch, grossWeight: 12000, tareWeight: 7500 }, USER);
      expect(repo.update).toHaveBeenCalledWith(
        10000n,
        expect.objectContaining({ tareWeight: 7500, netWeight: 4500 }),
      );
    });

    it('rejects gross < tare (negative net)', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip());
      await expect(
        service.record('10000', { ...dispatch, grossWeight: 7000 }, USER),
      ).rejects.toThrow('berat bersih akan menjadi negatif');
    });

    it('requires a gross weight', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip());
      await expect(service.record('10000', dispatch, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('PICKUP', () => {
    const pickup = (o = {}) =>
      buildTrip({ route: { ...(buildTrip().route as object), category: 'PICKUP' }, ...o });

    it('defaults the tare from the vehicle', async () => {
      repo.findForRecording.mockResolvedValue(pickup());
      await service.record('10000', dispatch, USER);
      expect(repo.update).toHaveBeenCalledWith(
        10000n,
        expect.objectContaining({ tareWeight: 8000 }),
      );
    });
  });

  describe('REFUEL', () => {
    const refuel = (o: Record<string, unknown> = {}) =>
      buildTrip({ route: { ...(buildTrip().route as object), category: 'REFUEL' }, ...o });

    it('defaults approved to requested', async () => {
      repo.findForRecording.mockResolvedValue(refuel());
      await service.record('10000', { ...dispatch, fuelRequestedLiters: 40 }, USER);
      expect(repo.update).toHaveBeenCalledWith(
        10000n,
        expect.objectContaining({ fuelRequestedLiters: 40, fuelApprovedLiters: 40 }),
      );
    });

    it('falls back to the templated requested amount', async () => {
      repo.findForRecording.mockResolvedValue(refuel({ fuelRequestedLiters: 35 }));
      await service.record('10000', dispatch, USER);
      expect(repo.update).toHaveBeenCalledWith(
        10000n,
        expect.objectContaining({ fuelRequestedLiters: 35, fuelApprovedLiters: 35 }),
      );
    });

    it('rejects a missing requested amount', async () => {
      repo.findForRecording.mockResolvedValue(refuel());
      await expect(service.record('10000', dispatch, USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects approved > requested without fuel:approve', async () => {
      repo.findForRecording.mockResolvedValue(refuel());
      await expect(
        service.record(
          '10000',
          { ...dispatch, fuelRequestedLiters: 40, fuelApprovedLiters: 50 },
          USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows approved > requested with fuel:approve', async () => {
      rolePermissions.getPermissionKeys.mockResolvedValue(['trip:record-fuel', 'fuel:approve']);
      repo.findForRecording.mockResolvedValue(refuel());
      await service.record(
        '10000',
        { ...dispatch, fuelRequestedLiters: 40, fuelApprovedLiters: 50 },
        USER,
      );
      expect(repo.update).toHaveBeenCalledWith(
        10000n,
        expect.objectContaining({ fuelApprovedLiters: 50 }),
      );
    });
  });

  describe('passive trips', () => {
    it('records a DEPART_POOL trip with no category fields', async () => {
      rolePermissions.getPermissionKeys.mockResolvedValue(['trip:update']);
      repo.findForRecording.mockResolvedValue(
        buildTrip({ route: { ...(buildTrip().route as object), category: 'DEPART_POOL' } }),
      );
      await service.record('10000', dispatch, USER);
      const data = repo.update.mock.calls[0][1] as Record<string, unknown>;
      expect(data.status).toBe('DONE');
      expect(data.grossWeight).toBeUndefined();
      expect(data.tareWeight).toBeUndefined();
    });
  });

  describe('verify', () => {
    it('rejects verifying a trip that is not DONE', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip({ status: 'IN_PROGRESS' }));
      await expect(service.verify('10000', USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks a DONE trip VERIFIED with the verifier and timestamp', async () => {
      repo.findForRecording.mockResolvedValue(buildTrip({ status: 'DONE' }));
      await service.verify('10000', USER);
      expect(repo.update).toHaveBeenCalledWith(
        10000n,
        expect.objectContaining({ status: 'VERIFIED', verifiedBy: { connect: { id: 9 } } }),
      );
    });

    it("refreshes the day's rollups for the verified trip", async () => {
      repo.findForRecording.mockResolvedValue(buildTrip({ status: 'DONE' }));
      await service.verify('10000', USER);
      expect(rollups.refreshForOperationDate).toHaveBeenCalledWith(
        new Date('2026-06-08T00:00:00Z'),
      );
    });
  });

  describe('getById', () => {
    it('404s an unknown trip', async () => {
      repo.findFull.mockResolvedValue(null);
      await expect(service.getById('1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the trip with its parent chain', async () => {
      repo.findFull.mockResolvedValue(
        buildTrip({
          haulAssignment: {
            id: 1000n,
            driverId: 3,
            driver: { id: 3, name: 'Budi' },
            haul: {
              id: 100n,
              vehicleId: 7,
              vehicle: { id: 7, plateNumber: 'L 1 AB' },
              transactionDay: {
                id: 1,
                date: new Date('2026-06-08T00:00:00Z'),
                status: 'IN_PROGRESS',
              },
            },
          },
        }),
      );
      const result = await service.getById('10000');
      expect(result.haulAssignment.haul.vehiclePlate).toBe('L 1 AB');
      expect(result.haulAssignment.haul.transactionDay.date).toBe('2026-06-08');
    });
  });
});
