import { Injectable, NotFoundException } from '@nestjs/common';
import { type Photo } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

import { type AttachTripPhotoDto } from './dto/attach-trip-photo.dto';

/** Polymorphic owner tag for trip photos (Photo.ownerType). */
const TRIP_OWNER = 'trip';

export interface TripPhotoDto {
  readonly id: string;
  readonly objectKey: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly createdAt: string;
  /** Short-lived presigned URL to view the image. */
  readonly url: string;
}

/**
 * Trip photo documentation (legacy `dokumentasitrayek`). Bytes live in object
 * storage (MinIO); this stores only metadata and hands back presigned view URLs.
 */
@Injectable()
export class TripPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(tripId: string): Promise<TripPhotoDto[]> {
    await this.assertTripExists(tripId);
    const photos = await this.prisma.photo.findMany({
      where: { ownerType: TRIP_OWNER, ownerId: tripId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(photos.map((photo) => this.toDto(photo)));
  }

  async attach(tripId: string, dto: AttachTripPhotoDto): Promise<TripPhotoDto> {
    await this.assertTripExists(tripId);
    const photo = await this.prisma.photo.create({
      data: {
        objectKey: dto.objectKey,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        checksum: dto.checksum,
        ...(dto.width !== undefined ? { width: dto.width } : {}),
        ...(dto.height !== undefined ? { height: dto.height } : {}),
        ownerType: TRIP_OWNER,
        ownerId: tripId,
      },
    });
    return this.toDto(photo);
  }

  private async assertTripExists(tripId: string): Promise<void> {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { id: true } });
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
  }

  private async toDto(photo: Photo): Promise<TripPhotoDto> {
    return {
      id: photo.id,
      objectKey: photo.objectKey,
      contentType: photo.contentType,
      sizeBytes: photo.sizeBytes,
      width: photo.width,
      height: photo.height,
      createdAt: photo.createdAt.toISOString(),
      url: await this.storage.getPresignedGetUrl(photo.objectKey),
    };
  }
}
