import { NotFoundException } from '@nestjs/common';

import { type PrismaService } from '../../prisma/prisma.service';
import { type StorageService } from '../../storage/storage.service';

import { TripPhotosService } from './trip-photos.service';

const DTO = {
  objectKey: 'trip/2026/06/abc.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 12345,
  checksum: 'deadbeef',
};

describe('TripPhotosService', () => {
  let prisma: {
    trip: { findUnique: jest.Mock };
    photo: { findMany: jest.Mock; create: jest.Mock };
  };
  let storage: { getPresignedGetUrl: jest.Mock };
  let service: TripPhotosService;

  beforeEach(() => {
    prisma = {
      trip: { findUnique: jest.fn().mockResolvedValue({ id: 'trip-1' }) },
      photo: { findMany: jest.fn(), create: jest.fn() },
    };
    storage = { getPresignedGetUrl: jest.fn().mockResolvedValue('https://minio/signed') };
    service = new TripPhotosService(
      prisma as unknown as PrismaService,
      storage as unknown as StorageService,
    );
  });

  it('attaches a photo tagged to the trip and returns a view URL', async () => {
    prisma.photo.create.mockResolvedValue({
      id: 'photo-1',
      objectKey: DTO.objectKey,
      contentType: DTO.contentType,
      sizeBytes: DTO.sizeBytes,
      width: null,
      height: null,
      createdAt: new Date('2026-06-08T00:00:00Z'),
    });
    const result = await service.attach('trip-1', DTO);
    expect(prisma.photo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerType: 'trip', ownerId: 'trip-1' }),
      }),
    );
    expect(result.url).toBe('https://minio/signed');
  });

  it('lists photos with presigned URLs', async () => {
    prisma.photo.findMany.mockResolvedValue([
      {
        id: 'photo-1',
        objectKey: DTO.objectKey,
        contentType: DTO.contentType,
        sizeBytes: DTO.sizeBytes,
        width: 800,
        height: 600,
        createdAt: new Date('2026-06-08T00:00:00Z'),
      },
    ]);
    const result = await service.list('trip-1');
    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe('https://minio/signed');
    expect(storage.getPresignedGetUrl).toHaveBeenCalledWith(DTO.objectKey);
  });

  it('404s when the trip does not exist', async () => {
    prisma.trip.findUnique.mockResolvedValue(null);
    await expect(service.attach('missing', DTO)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.list('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
