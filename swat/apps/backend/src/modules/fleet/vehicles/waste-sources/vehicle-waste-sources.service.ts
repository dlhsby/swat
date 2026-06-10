import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

export interface VehicleWasteSourceDto {
  readonly id: string;
  readonly wasteSourceId: string;
  readonly code: string;
  readonly name: string;
}

@Injectable()
export class VehicleWasteSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertVehicleExists(vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Kendaraan tidak ditemukan.');
    }
  }

  async list(vehicleId: string): Promise<VehicleWasteSourceDto[]> {
    await this.assertVehicleExists(vehicleId);
    const links = await this.prisma.vehicleWasteSource.findMany({
      where: { vehicleId },
      include: { wasteSource: { select: { id: true, code: true, name: true } } },
      orderBy: { wasteSource: { code: 'asc' } },
    });
    return links.map((link) => ({
      id: link.id,
      wasteSourceId: link.wasteSourceId,
      code: link.wasteSource.code,
      name: link.wasteSource.name,
    }));
  }

  async add(vehicleId: string, wasteSourceId: string): Promise<VehicleWasteSourceDto> {
    await this.assertVehicleExists(vehicleId);
    const source = await this.prisma.wasteSource.findUnique({
      where: { id: wasteSourceId },
      select: { id: true, code: true, name: true },
    });
    if (!source) {
      throw new NotFoundException('Sumber sampah tidak ditemukan.');
    }
    const existing = await this.prisma.vehicleWasteSource.findUnique({
      where: { vehicleId_wasteSourceId: { vehicleId, wasteSourceId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Sumber sampah sudah terhubung ke kendaraan ini.');
    }
    const link = await this.prisma.vehicleWasteSource.create({
      data: { vehicleId, wasteSourceId },
      select: { id: true, wasteSourceId: true },
    });
    return { id: link.id, wasteSourceId: link.wasteSourceId, code: source.code, name: source.name };
  }

  async remove(vehicleId: string, wasteSourceId: string): Promise<{ message: string }> {
    const link = await this.prisma.vehicleWasteSource.findUnique({
      where: { vehicleId_wasteSourceId: { vehicleId, wasteSourceId } },
      select: { id: true },
    });
    if (!link) {
      throw new NotFoundException('Tautan sumber sampah tidak ditemukan.');
    }
    await this.prisma.vehicleWasteSource.delete({ where: { id: link.id } });
    return { message: 'Tautan sumber sampah telah dihapus.' };
  }
}
