import { BadRequestException, NotFoundException } from '@nestjs/common';

import { type SessionUser } from '../../../common/auth/session.types';

import { type HaulAssignmentsRepository } from './haul-assignments.repository';
import { HaulAssignmentsService } from './haul-assignments.service';

const USER: SessionUser = {
  id: 'user-9',
  username: 'op',
  roleId: 'role-4',
  mustChangePassword: false,
};

function buildAssignment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'assignment-1000',
    haulId: 'haul-100',
    driverId: 'driver-3',
    driver: { id: 'driver-3', name: 'Budi' },
    scheduleTemplateId: 'schedule-1',
    status: 'IN_PROGRESS',
    operationDate: new Date('2026-06-08T00:00:00Z'),
    departTargetOdometer: 12000,
    departActualOdometer: null,
    returnTargetOdometer: 12000,
    returnActualOdometer: null,
    departTargetTime: new Date('2026-06-08T05:00:00Z'),
    departActualTime: null,
    returnTargetTime: new Date('2026-06-08T14:00:00Z'),
    returnActualTime: null,
    createdAt: new Date('2026-06-08T03:00:00Z'),
    updatedAt: new Date('2026-06-08T03:00:00Z'),
    trips: [],
    haul: {
      id: 'haul-100',
      status: 'IN_PROGRESS',
      vehicleId: 'vehicle-7',
      vehicle: { id: 'vehicle-7', currentOdometer: 12000 },
      assignments: [{ id: 'assignment-1000', status: 'IN_PROGRESS' }],
    },
    ...overrides,
  };
}

describe('HaulAssignmentsService', () => {
  let repo: {
    findForRecording: jest.Mock;
    recordDepart: jest.Mock;
    recordReturn: jest.Mock;
    listTrips: jest.Mock;
    findHaul: jest.Mock;
    findDay: jest.Mock;
    findVehicle: jest.Mock;
    driverExists: jest.Mock;
    haulExistsForVehicle: jest.Mock;
    createAssignment: jest.Mock;
    createHaulWithAssignment: jest.Mock;
  };
  let service: HaulAssignmentsService;

  beforeEach(() => {
    repo = {
      findForRecording: jest.fn(),
      recordDepart: jest.fn((_id, data) => Promise.resolve(buildAssignment(data))),
      recordReturn: jest.fn(({ data }) => Promise.resolve(buildAssignment(data))),
      listTrips: jest.fn().mockResolvedValue([]),
      findHaul: jest.fn().mockResolvedValue({
        id: 'haul-100',
        status: 'IN_PROGRESS',
        operationDate: new Date('2026-06-08T00:00:00Z'),
        vehicle: { currentOdometer: 12000 },
      }),
      findDay: jest
        .fn()
        .mockResolvedValue({
          id: 'day-1',
          date: new Date('2026-06-08T00:00:00Z'),
          status: 'IN_PROGRESS',
        }),
      findVehicle: jest.fn().mockResolvedValue({ id: 'vehicle-7', currentOdometer: 12000 }),
      driverExists: jest.fn().mockResolvedValue(true),
      haulExistsForVehicle: jest.fn().mockResolvedValue(false),
      createAssignment: jest.fn((data) => Promise.resolve(buildAssignment(data))),
      createHaulWithAssignment: jest.fn((_haul, a) => Promise.resolve(buildAssignment(a))),
    };
    service = new HaulAssignmentsService(repo as unknown as HaulAssignmentsRepository);
  });

  describe('addAssignment (second shift)', () => {
    it('adds a shift to an existing haul with the vehicle odometer as target', async () => {
      await service.addAssignment(
        { haulId: 'haul-100', driverId: 'driver-9', departTime: '17:00' },
        USER,
      );
      expect(repo.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          haulId: 'haul-100',
          driverId: 'driver-9',
          departTargetOdometer: 12000,
          status: 'IN_PROGRESS',
        }),
      );
    });

    it('404s an unknown haul', async () => {
      repo.findHaul.mockResolvedValue(null);
      await expect(
        service.addAssignment({ haulId: 'x', driverId: 'd' }, USER),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects adding to a closed haul', async () => {
      repo.findHaul.mockResolvedValue({
        id: 'haul-100',
        status: 'DONE',
        operationDate: new Date('2026-06-08T00:00:00Z'),
        vehicle: { currentOdometer: 12000 },
      });
      await expect(
        service.addAssignment({ haulId: 'haul-100', driverId: 'd' }, USER),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('addHaul (add vehicle to a day)', () => {
    it('creates a haul + first shift', async () => {
      await service.addHaul(
        { transactionDayId: 'day-1', vehicleId: 'vehicle-7', driverId: 'driver-3' },
        USER,
      );
      expect(repo.createHaulWithAssignment).toHaveBeenCalled();
    });

    it('rejects a vehicle already scheduled that day', async () => {
      repo.haulExistsForVehicle.mockResolvedValue(true);
      await expect(
        service.addHaul(
          { transactionDayId: 'day-1', vehicleId: 'vehicle-7', driverId: 'driver-3' },
          USER,
        ),
      ).rejects.toMatchObject({ status: 422 });
      expect(repo.createHaulWithAssignment).not.toHaveBeenCalled();
    });
  });

  describe('recordDepart', () => {
    it('404s an unknown assignment', async () => {
      repo.findForRecording.mockResolvedValue(null);
      await expect(
        service.recordDepart(
          '1',
          { actualOdometer: 12000, actualTime: '2026-06-08T05:30:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s an unknown id', async () => {
      repo.findForRecording.mockResolvedValue(null);
      await expect(
        service.recordDepart(
          'unknown-id',
          { actualOdometer: 1, actualTime: '2026-06-08T05:30:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an odometer below the vehicle current odometer', async () => {
      repo.findForRecording.mockResolvedValue(buildAssignment());
      await expect(
        service.recordDepart(
          '1000',
          { actualOdometer: 11999, actualTime: '2026-06-08T05:30:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects departing an already-done assignment', async () => {
      repo.findForRecording.mockResolvedValue(buildAssignment({ status: 'DONE' }));
      await expect(
        service.recordDepart(
          '1000',
          { actualOdometer: 12010, actualTime: '2026-06-08T05:30:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('records the departure odometer and time', async () => {
      repo.findForRecording.mockResolvedValue(buildAssignment());
      await service.recordDepart(
        '1000',
        { actualOdometer: 12010, actualTime: '2026-06-08T05:30:00.000Z' },
        USER,
      );
      expect(repo.recordDepart).toHaveBeenCalledWith(
        'assignment-1000',
        expect.objectContaining({
          departActualOdometer: 12010,
          departActualTime: new Date('2026-06-08T05:30:00.000Z'),
        }),
      );
    });
  });

  describe('recordReturn', () => {
    const departed = (overrides: Record<string, unknown> = {}): Record<string, unknown> =>
      buildAssignment({
        departActualOdometer: 12010,
        departActualTime: new Date('2026-06-08T05:30:00Z'),
        ...overrides,
      });

    it('requires departure to be recorded first', async () => {
      repo.findForRecording.mockResolvedValue(buildAssignment());
      await expect(
        service.recordReturn(
          '1000',
          { actualOdometer: 12100, actualTime: '2026-06-08T14:30:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a return odometer below the departure odometer', async () => {
      repo.findForRecording.mockResolvedValue(departed());
      await expect(
        service.recordReturn(
          '1000',
          { actualOdometer: 12009, actualTime: '2026-06-08T14:30:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a return time before the departure time', async () => {
      repo.findForRecording.mockResolvedValue(departed());
      await expect(
        service.recordReturn(
          '1000',
          { actualOdometer: 12100, actualTime: '2026-06-08T05:00:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('closes the assignment and haul when it is the last open one', async () => {
      repo.findForRecording.mockResolvedValue(departed());
      await service.recordReturn(
        '1000',
        { actualOdometer: 12100, actualTime: '2026-06-08T14:30:00.000Z' },
        USER,
      );
      expect(repo.recordReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'assignment-1000',
          haulId: 'haul-100',
          vehicleId: 'vehicle-7',
          odometer: 12100,
          closeHaul: true,
        }),
      );
    });

    it('rejects returning an already-done assignment', async () => {
      repo.findForRecording.mockResolvedValue(departed({ status: 'DONE' }));
      await expect(
        service.recordReturn(
          '1000',
          { actualOdometer: 12100, actualTime: '2026-06-08T14:30:00Z' },
          USER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('keeps the haul open when a sibling assignment is still in progress', async () => {
      repo.findForRecording.mockResolvedValue(
        departed({
          haul: {
            id: 'haul-100',
            status: 'IN_PROGRESS',
            vehicleId: 'vehicle-7',
            vehicle: { id: 'vehicle-7', currentOdometer: 12010 },
            assignments: [
              { id: 'assignment-1000', status: 'IN_PROGRESS' },
              { id: 'assignment-1001', status: 'IN_PROGRESS' },
            ],
          },
        }),
      );
      await service.recordReturn(
        '1000',
        { actualOdometer: 12100, actualTime: '2026-06-08T14:30:00.000Z' },
        USER,
      );
      expect(repo.recordReturn).toHaveBeenCalledWith(expect.objectContaining({ closeHaul: false }));
    });
  });

  describe('listTrips', () => {
    it('returns the assignment trips mapped to DTOs', async () => {
      repo.findForRecording.mockResolvedValue(buildAssignment());
      repo.listTrips.mockResolvedValue([
        {
          id: 'trip-10000',
          haulAssignmentId: 'assignment-1000',
          routeId: 'route-4',
          route: {
            id: 'route-4',
            category: 'DISPOSAL',
            originSite: { name: 'TPS A' },
            destinationSite: { name: 'TPA B' },
          },
          recordedBy: null,
          verifiedBy: null,
          status: 'IN_PROGRESS',
          name: 'DISPOSAL: TPS A → TPA B',
          operationDate: new Date('2026-06-08T00:00:00Z'),
          targetTime: null,
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
        },
      ]);
      const trips = await service.listTrips('1000');
      expect(trips).toHaveLength(1);
      expect(trips[0]).toMatchObject({ id: 'trip-10000', routeCategory: 'DISPOSAL' });
      expect(repo.listTrips).toHaveBeenCalledWith('assignment-1000');
    });
  });
});
