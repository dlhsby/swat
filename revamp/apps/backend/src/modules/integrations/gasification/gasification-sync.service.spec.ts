import { ConflictException, NotFoundException } from '@nestjs/common';

import { type SystemConfigService } from '../../../config';
import { type StorageService } from '../../storage/storage.service';

import { type GasificationClientService } from './gasification-client.service';
import { GasificationSyncService } from './gasification-sync.service';
import { type GasificationRepository } from './gasification.repository';
import { type GasificationRecord } from './gasification.types';

/** A DISPOSAL trip candidate with a fixed disposal time. */
function trip(id: string, plate: string, timeIso: string, dest = 'LANDFILL') {
  return {
    id,
    plateNumber: plate,
    actualTime: new Date(timeIso),
    arrivedAt: null,
    disposalDestination: dest,
  };
}

/** An unmatched entry (normalized plate + entry instant). */
function entry(id: string, plate: string, enteredIso: string) {
  return { id, plateNumber: plate, enteredAt: new Date(enteredIso) };
}

function makeRecord(over: Partial<GasificationRecord> = {}): GasificationRecord {
  return {
    vendorNopol: 'L 9647 CM',
    plateNumber: 'L9647CM',
    enteredAt: new Date('2026-05-07T07:00:00.000Z'),
    operationDate: new Date('2026-05-07T00:00:00.000Z'),
    userTally: 'budi',
    fotoFilename: 'abc.jpg',
    raw: {},
    ...over,
  };
}

describe('GasificationSyncService', () => {
  let client: jest.Mocked<
    Pick<GasificationClientService, 'fetchByDate' | 'downloadPhoto' | 'isConfigured'>
  >;
  let repo: {
    upsert: jest.Mock;
    setPhoto: jest.Mock;
    findUnmatchedByDate: jest.Mock;
    disposalTripsForDate: jest.Mock;
    claimTrip: jest.Mock;
    unmatch: jest.Mock;
    findById: jest.Mock;
    isDisposalTrip: jest.Mock;
    list: jest.Mock;
  };
  let storage: { uploadObject: jest.Mock; getPresignedGetUrl: jest.Mock };
  let systemConfig: {
    getGasificationMatchWindow: jest.Mock;
    getGasificationLookbackDays: jest.Mock;
  };
  let service: GasificationSyncService;

  beforeEach(() => {
    client = {
      fetchByDate: jest.fn().mockResolvedValue([]),
      downloadPhoto: jest.fn().mockResolvedValue(null),
      isConfigured: true,
    } as unknown as typeof client;
    repo = {
      upsert: jest.fn(),
      setPhoto: jest.fn().mockResolvedValue(undefined),
      findUnmatchedByDate: jest.fn().mockResolvedValue([]),
      disposalTripsForDate: jest.fn().mockResolvedValue([]),
      claimTrip: jest.fn().mockResolvedValue(true),
      unmatch: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      isDisposalTrip: jest.fn().mockResolvedValue(true),
      list: jest.fn(),
    };
    storage = {
      uploadObject: jest.fn().mockResolvedValue(undefined),
      getPresignedGetUrl: jest.fn().mockResolvedValue('https://minio/signed'),
    };
    systemConfig = {
      getGasificationMatchWindow: jest.fn().mockReturnValue({ beforeMin: 30, afterMin: 120 }),
      getGasificationLookbackDays: jest.fn().mockReturnValue(2),
    };
    service = new GasificationSyncService(
      client as unknown as GasificationClientService,
      repo as unknown as GasificationRepository,
      storage as unknown as StorageService,
      systemConfig as unknown as SystemConfigService,
    );
  });

  describe('matching (via syncDate)', () => {
    it('matches an entry to the closest disposal trip within the window', async () => {
      repo.findUnmatchedByDate.mockResolvedValue([entry('e1', 'L9647CM', '2026-05-07T07:00:00Z')]);
      repo.disposalTripsForDate.mockResolvedValue([
        trip('t-close', 'L 9647 CM', '2026-05-07T06:32:00Z'), // +28 min
        trip('t-far', 'L 9647 CM', '2026-05-07T05:00:00Z'), // +120 min
      ]);

      const result = await service.syncDate('2026-05-07');

      expect(repo.claimTrip).toHaveBeenCalledTimes(1);
      expect(repo.claimTrip).toHaveBeenCalledWith('e1', 't-close', null);
      expect(result.matched).toBe(1);
    });

    it('leaves an ambiguous tie unmatched (never guesses)', async () => {
      repo.findUnmatchedByDate.mockResolvedValue([entry('e1', 'L9647CM', '2026-05-07T07:00:00Z')]);
      repo.disposalTripsForDate.mockResolvedValue([
        trip('t-a', 'L9647CM', '2026-05-07T06:30:00Z'), // +30 min
        trip('t-b', 'L9647CM', '2026-05-07T07:30:00Z'), // -30 min → equal |Δ|
      ]);

      const result = await service.syncDate('2026-05-07');

      expect(repo.claimTrip).not.toHaveBeenCalled();
      expect(result.matched).toBe(0);
    });

    it('does not match a trip outside the time window', async () => {
      repo.findUnmatchedByDate.mockResolvedValue([entry('e1', 'L9647CM', '2026-05-07T07:00:00Z')]);
      // +150 min — beyond the 120-min afterMin ceiling.
      repo.disposalTripsForDate.mockResolvedValue([trip('t1', 'L9647CM', '2026-05-07T04:30:00Z')]);

      await service.syncDate('2026-05-07');

      expect(repo.claimTrip).not.toHaveBeenCalled();
    });

    it('does not reuse a trip already claimed earlier in the same run', async () => {
      repo.findUnmatchedByDate.mockResolvedValue([
        entry('e1', 'L9647CM', '2026-05-07T07:00:00Z'),
        entry('e2', 'L9647CM', '2026-05-07T07:01:00Z'),
      ]);
      repo.disposalTripsForDate.mockResolvedValue([trip('t1', 'L9647CM', '2026-05-07T06:40:00Z')]);

      const result = await service.syncDate('2026-05-07');

      expect(repo.claimTrip).toHaveBeenCalledTimes(1);
      expect(result.matched).toBe(1);
    });

    it('ignores a trip already flagged GASIFICATION', async () => {
      repo.findUnmatchedByDate.mockResolvedValue([entry('e1', 'L9647CM', '2026-05-07T07:00:00Z')]);
      repo.disposalTripsForDate.mockResolvedValue([
        trip('t1', 'L9647CM', '2026-05-07T06:40:00Z', 'GASIFICATION'),
      ]);

      await service.syncDate('2026-05-07');

      expect(repo.claimTrip).not.toHaveBeenCalled();
    });
  });

  describe('per-plate querying (PTSI needs nopol + tanggal)', () => {
    it('queries PTSI once per distinct unmatched (LANDFILL) plate', async () => {
      repo.disposalTripsForDate.mockResolvedValue([
        trip('t1', 'L 9647 CM', '2026-05-07T06:00:00Z'), // LANDFILL
        trip('t2', 'L9647CM', '2026-05-07T09:00:00Z'), // same plate normalized → 1 query
        trip('t3', 'B1234XY', '2026-05-07T06:00:00Z'), // different plate
        trip('t4', 'N5555ZZ', '2026-05-07T06:00:00Z', 'GASIFICATION'), // matched → skipped
      ]);

      await service.syncDate('2026-05-07');

      const platesQueried = client.fetchByDate.mock.calls.map((c) => c[1]).sort();
      expect(platesQueried).toEqual(['B1234XY', 'L9647CM']);
    });

    it('queries only the requested plate when nopol is given', async () => {
      await service.syncDate('2026-05-07', 'L 9647 CM');
      expect(client.fetchByDate).toHaveBeenCalledTimes(1);
      expect(client.fetchByDate).toHaveBeenCalledWith('2026-05-07', 'L9647CM');
    });
  });

  describe('photo storage (dedup)', () => {
    it('downloads + stores the photo for a new entry, then records the key', async () => {
      client.fetchByDate.mockResolvedValue([makeRecord()]);
      repo.upsert.mockResolvedValue({
        id: 'e1',
        status: 'UNMATCHED',
        photoObjectKey: null,
        matchedTripId: null,
        plateNumber: 'L9647CM',
        enteredAt: new Date('2026-05-07T07:00:00Z'),
      });
      client.downloadPhoto.mockResolvedValue({
        body: Buffer.from('img'),
        contentType: 'image/jpeg',
      });

      await service.syncDate('2026-05-07', 'L9647CM');

      expect(storage.uploadObject).toHaveBeenCalledTimes(1);
      expect(repo.setPhoto).toHaveBeenCalledWith(
        'e1',
        expect.stringMatching(/^gasification\/2026\/05\/e1\.jpg$/),
      );
    });

    it('skips download when the entry already has a stored photo', async () => {
      client.fetchByDate.mockResolvedValue([makeRecord()]);
      repo.upsert.mockResolvedValue({
        id: 'e1',
        status: 'MATCHED',
        photoObjectKey: 'gasification/2026/05/e1.jpg',
        matchedTripId: 't1',
        plateNumber: 'L9647CM',
        enteredAt: new Date('2026-05-07T07:00:00Z'),
      });

      await service.syncDate('2026-05-07', 'L9647CM');

      expect(client.downloadPhoto).not.toHaveBeenCalled();
      expect(storage.uploadObject).not.toHaveBeenCalled();
    });
  });

  describe('manualMatch', () => {
    it('404s when the entry does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.manualMatch('missing', 't1', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('409s when the trip is already claimed by another entry', async () => {
      repo.findById.mockResolvedValue({ id: 'e1', matchedTripId: null });
      repo.isDisposalTrip.mockResolvedValue(true);
      repo.claimTrip.mockResolvedValue(false);
      await expect(service.manualMatch('e1', 't1', 'u1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('claims the trip on success', async () => {
      repo.findById.mockResolvedValue({ id: 'e1', matchedTripId: null });
      repo.isDisposalTrip.mockResolvedValue(true);
      repo.claimTrip.mockResolvedValue(true);
      await service.manualMatch('e1', 't1', 'u1');
      expect(repo.claimTrip).toHaveBeenCalledWith('e1', 't1', 'u1');
    });
  });

  describe('unmatch', () => {
    it('reverts the match for an existing entry', async () => {
      repo.findById.mockResolvedValue({ id: 'e1', matchedTripId: 't1' });
      await service.unmatch('e1', 'u1');
      expect(repo.unmatch).toHaveBeenCalledWith('e1', 'u1');
    });

    it('404s for a missing entry', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.unmatch('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
